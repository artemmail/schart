using System;
using Keras;
using Keras.Layers;
using Keras.Models;
using Numpy;
using
 StockChart.EventBus.Models;

public class CandlePredictionModel
{
    private const int SequenceLength = 60;  // Длина последовательности (например, последние 60 минут)
    private const int PredictionLength = 10; // Количество свечей, которые мы хотим предсказать
    private const int FeaturesCount = 9;    // Количество признаков

    public static void Main(string[] args)
    {
        // Загружаем данные за последний год
        var candles = LoadDataForLastYear();

        // Готовим данные для обучения
        var (xTrain, yTrain) = PrepareData(candles);

        // Создаем модель
        var model = CreateModel();

        // Компиляция модели
        model.Compile(optimizer: new Keras.Optimizers.Adam(), loss: "mse");

        // Обучаем модель
        model.Fit(xTrain, yTrain, batch_size: 32, epochs: 50, validation_split: 0.2f);

        // Сохраняем модель на диск
        string modelPath = "candle_prediction_model.h5";
        model.Save(modelPath);

        // Загружаем модель с диска
        var loadedModel = Sequential.LoadModel(modelPath);

        // Используем загруженную модель для предсказания
        var currentDayCandles = GetCurrentDayCandles();
        var prediction = Predict(loadedModel, currentDayCandles);

        // Выводим результаты предсказания
        Console.WriteLine("Prediction Results:");
        for (int i = 0; i < prediction.shape[0]; i++)
        {
            Console.WriteLine($"Candle {i + 1}:");
            Console.WriteLine($"Open: {prediction[i, 0]}");
            Console.WriteLine($"Close: {prediction[i, 1]}");
            Console.WriteLine($"Low: {prediction[i, 2]}");
            Console.WriteLine($"High: {prediction[i, 3]}");
            Console.WriteLine($"Quantity: {prediction[i, 4]}");
            Console.WriteLine($"Volume: {prediction[i, 5]}");
            Console.WriteLine($"Buy Quantity: {prediction[i, 6]}");
            Console.WriteLine($"Buy Volume: {prediction[i, 7]}");
            Console.WriteLine($"OI: {prediction[i, 8]}");
            Console.WriteLine();
        }
    }

    private static BaseCandle[] LoadDataForLastYear()
    {
        var candles = new List<BaseCandle>();
        DateTime startDate = DateTime.Now.AddYears(-1);
        DateTime endDate = DateTime.Now;

        for (DateTime date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var dailyCandles = getCandles(date);  // Получаем данные за день
            candles.AddRange(dailyCandles);
        }

        return candles.ToArray();
    }

    private static (NDarray, NDarray) PrepareData(BaseCandle[] candles)
    {
        var sequences = new List<NDarray>();
        var targets = new List<NDarray>();

        for (int i = 0; i < candles.Length - SequenceLength - PredictionLength; i++)
        {
            var sequence = np.array(candles.Skip(i).Take(SequenceLength)
                .Select(c => new[] {
                    (float)c.OpnPrice, (float)c.ClsPrice, (float)c.MinPrice,
                    (float)c.MaxPrice, (float)c.Quantity, (float)c.Volume,
                    (float)c.BuyQuantity, (float)c.BuyVolume, (float)c.Oi
                }).ToArray());

            var target = np.array(candles.Skip(i + SequenceLength).Take(PredictionLength)
                .Select(c => new[] {
                    (float)c.OpnPrice, (float)c.ClsPrice, (float)c.MinPrice,
                    (float)c.MaxPrice, (float)c.Quantity, (float)c.Volume,
                    (float)c.BuyQuantity, (float)c.BuyVolume, (float)c.Oi
                }).ToArray());

            sequences.Add(sequence);
            targets.Add(target);
        }

        return (np.array(sequences.ToArray()), np.array(targets.ToArray()));
    }

    private static Sequential CreateModel()
    {
        var model = new Sequential();
        model.Add(new LSTM(64, return_sequences: true, input_shape: new Shape(SequenceLength, FeaturesCount)));
        model.Add(new LSTM(64));
        model.Add(new Dense(PredictionLength * FeaturesCount));
        model.Add(new Reshape(new Shape(PredictionLength, FeaturesCount)));

        return model;
    }

    private static BaseCandle[] GetCurrentDayCandles()
    {
        DateTime currentDay = DateTime.Today;
        return getCandles(currentDay);
    }

    private static NDarray Predict(BaseModel model, BaseCandle[] candles)
    {
        var input = np.array(candles.Take(SequenceLength)
            .Select(c => new[] {
                (float)c.OpnPrice, (float)c.ClsPrice, (float)c.MinPrice,
                (float)c.MaxPrice, (float)c.Quantity, (float)c.Volume,
                (float)c.BuyQuantity, (float)c.BuyVolume, (float)c.Oi
            }).ToArray());

        input = input.reshape(1, SequenceLength, FeaturesCount);

        var prediction = model.Predict(input);
        return prediction.reshape(PredictionLength, FeaturesCount);
    }

    private static BaseCandle[] getCandles(DateTime day)
    {
        // Здесь реализуйте логику получения данных свечей за конкретный день
        throw new NotImplementedException();
    }
}

