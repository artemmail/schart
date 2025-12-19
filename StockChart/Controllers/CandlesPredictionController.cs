using Microsoft.AspNetCore.Mvc;
using Microsoft.ML;
using Microsoft.ML.Data;
using StockChart.EventBus.Models;
using StockChart.Model;
using StockChart.Repository;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace StockChart.Controllers
{
    public class CandleDto
    {
        public float OpnPrice { get; set; }
        public float ClsPrice { get; set; }
        public float MinPrice { get; set; }
        public float MaxPrice { get; set; }
        public float Quantity { get; set; }
        public float Volume { get; set; }
        public float BuyQuantity { get; set; }
        public float BuyVolume { get; set; }
    }

    public class CandlePrediction
    {
        public float PredictedOpnPrice { get; set; }
        public float PredictedClsPrice { get; set; }
        public float PredictedMinPrice { get; set; }
        public float PredictedMaxPrice { get; set; }
        public float PredictedQuantity { get; set; }
        public float PredictedVolume { get; set; }
        public float PredictedBuyQuantity { get; set; }
        public float PredictedBuyVolume { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class CandlePredictionController : ControllerBase
    {
        private readonly ICandlesRepository _candlesRepository;
        private readonly MLContext _mlContext;

        public CandlePredictionController(ICandlesRepository candlesRepository)
        {
            _candlesRepository = candlesRepository;
            _mlContext = new MLContext();
        }

        [HttpGet("train")]
        public async Task<IActionResult> TrainModel(string ticker)
        {
            DateTime endDate = DateTime.Now;
            DateTime startDate = endDate.AddYears(-1);

            // Получаем данные за последний год
            List<CandleDto> candles = (await _candlesRepository.GetCandles(ticker, 1, startDate, endDate, int.MaxValue)).Select(c => new CandleDto
            {
                OpnPrice = (float)c.OpnPrice,
                ClsPrice = (float)c.ClsPrice,
                MinPrice = (float)c.MinPrice,
                MaxPrice = (float)c.MaxPrice,
                Quantity = (float)c.Quantity,
                Volume = (float)c.Volume,
                BuyQuantity = (float)c.BuyQuantity,
                BuyVolume = (float)c.BuyVolume,
            }).ToList();

            // Подготовка данных для обучения модели на временных рядах
            var data = PrepareTimeSeriesData(candles);

            // Создание конвейера для машинного обучения
            var pipeline = _mlContext.Transforms.Concatenate("Features",
                "OpnPrice", "MinPrice", "MaxPrice", "Quantity", "Volume", "BuyQuantity", "BuyVolume",
                "Prev1_ClsPrice", "Prev2_ClsPrice", "Prev3_ClsPrice", "Prev4_ClsPrice")
                .Append(_mlContext.Transforms.CopyColumns(outputColumnName: "Label", inputColumnName: nameof(CandleDto.ClsPrice)))
                .Append(_mlContext.Regression.Trainers.FastTree());

            // Обучение модели
            var model = pipeline.Fit(data);

            // Сохранение модели с указанием тикера в имени файла
            string modelPath = $"c:/phyton38/{ticker}_candle_prediction_model.zip";
            using (var fileStream = new FileStream(modelPath, FileMode.Create, FileAccess.Write, FileShare.Write))
            {
                _mlContext.Model.Save(model, data.Schema, fileStream);
            }

            return Ok($"Model trained and saved successfully as {modelPath}.");
        }

        [HttpPost("predict")]
        public async Task<IActionResult> PredictCandles(string ticker, int numPredictions)
        {
            // Загрузка модели, обученной для данного тикера
            string modelPath = $"c:/phyton38/{ticker}_candle_prediction_model.zip";
            DataViewSchema modelSchema;
            ITransformer model = _mlContext.Model.Load(modelPath, out modelSchema);

            // Получаем данные за последний день
            DateTime today = DateTime.Today;
            var recentCandles = (await _candlesRepository.GetCandles(ticker, 1, today, today, int.MaxValue)).Select(c => new CandleDto
            {
                OpnPrice = (float)c.OpnPrice,
                ClsPrice = (float)c.ClsPrice,
                MinPrice = (float)c.MinPrice,
                MaxPrice = (float)c.MaxPrice,
                Quantity = (float)c.Quantity,
                Volume = (float)c.Volume,
                BuyQuantity = (float)c.BuyQuantity,
                BuyVolume = (float)c.BuyVolume
            }).ToList();

            if (recentCandles.Count < 5)
            {
                return BadRequest("Not enough candles available for prediction.");
            }

            var predictionEngine = _mlContext.Model.CreatePredictionEngine<CandleDto, CandlePrediction>(model);

            List<CandlePrediction> predictions = new List<CandlePrediction>();

            // Используем последние 5 свечей для предсказания следующей свечи
            for (int i = 0; i < numPredictions; i++)
            {
                var currentCandle = CreateCandleWithPreviousData(recentCandles);

                var prediction = predictionEngine.Predict(currentCandle);

                // Обновляем данные, добавляя предсказанную свечу
                var predictedCandle = new CandleDto
                {
                    OpnPrice = prediction.PredictedOpnPrice,
                    ClsPrice = prediction.PredictedClsPrice,
                    MinPrice = prediction.PredictedMinPrice,
                    MaxPrice = prediction.PredictedMaxPrice,
                    Quantity = prediction.PredictedQuantity,
                    Volume = prediction.PredictedVolume,
                    BuyQuantity = prediction.PredictedBuyQuantity,
                    BuyVolume = prediction.PredictedBuyVolume
                };

                recentCandles.Add(predictedCandle);
                predictions.Add(prediction);
            }

            return Ok(predictions);
        }

        private CandleDto CreateCandleWithPreviousData(List<CandleDto> recentCandles)
        {
            var lastCandle = recentCandles.Last();
            return new CandleDto
            {
                OpnPrice = lastCandle.OpnPrice,
                ClsPrice = lastCandle.ClsPrice,
                MinPrice = lastCandle.MinPrice,
                MaxPrice = lastCandle.MaxPrice,
                Quantity = lastCandle.Quantity,
                Volume = lastCandle.Volume,
                BuyQuantity = lastCandle.BuyQuantity,
                BuyVolume = lastCandle.BuyVolume
               
            };
        }

        private IDataView PrepareTimeSeriesData(List<CandleDto> candles)
        {
            var rows = new List<CandleDto>();

            // Создаем временные ряды для обучения
            for (int i = 4; i < candles.Count; i++)
            {
                rows.Add(new CandleDto
                {
                    OpnPrice = candles[i].OpnPrice,
                    ClsPrice = candles[i].ClsPrice,
                    MinPrice = candles[i].MinPrice,
                    MaxPrice = candles[i].MaxPrice,
                    Quantity = candles[i].Quantity,
                    Volume = candles[i].Volume,
                    BuyQuantity = candles[i].BuyQuantity,
                    BuyVolume = candles[i].BuyVolume
                  
                });
            }

            return _mlContext.Data.LoadFromEnumerable(rows);
        }
    }
}
