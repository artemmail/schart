using Microsoft.AspNetCore.Mvc;

using Microsoft.AspNetCore.Mvc;
using StockChart.Repository.Services;
using System.Threading.Tasks;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BatchImportController : ControllerBase
    {
        private readonly BatchImportOpenPositionsServiceNew _batchImportService;

        public BatchImportController(BatchImportOpenPositionsServiceNew batchImportService)
        {
            _batchImportService = batchImportService;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            if (_batchImportService.IsRunning)
            {
                // Если процесс уже запущен, возвращаем сообщение с перечислением обработанных файлов
                return Ok(new
                {
                    Status = "already works",
                    ProcessedContracts = _batchImportService.ProcessedContracts
                });
            }

            // Если процесс не запущен, запускаем его
            //await
                _batchImportService.StartDownloadAndImportAsync();

            // Возвращаем сообщение, что процесс был запущен
            return Ok(new
            {
                Status = "start",
                ProcessedContracts = _batchImportService.ProcessedContracts
            });
        }
    }
}
