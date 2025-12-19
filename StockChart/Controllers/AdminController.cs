using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SignalRMvc.Hubs;
using StockChart.Hubs;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        [HttpGet("ShowProfit")]
        [Admin]
        public async Task<IActionResult> ShowProfit()
        {
            var profits = await _adminService.GetProfitAsync();
            return Ok(profits);
        }

        [HttpGet("ShowProfitTotal")]
        [Admin]
        public async Task<IActionResult> ShowProfitTotal()
        {
            var cumulativeProfits = await _adminService.GetProfitTotalAsync();
            return Ok(cumulativeProfits);
        }

        [HttpGet("Hub")]
        public IActionResult Hub()
        {
            var result = new
            {
                TimedHostedService.counter,
                TimedHostedService.counter2
            };
            return Ok(result);
        }

        [HttpGet("ReturnedUsers")]
        [Admin]
        public async Task<IActionResult> ReturnedUsers()
        {
            var result = await _adminService.GetReturnedUsersAsync();
            return Ok(result);
        }

        [HttpGet("CandlesUpd")]
        [Admin]
        public IActionResult CandlesUpd()
        {
            var result = CandlesHub.CandlesUpd.Keys.ToList();
            return Ok(result);
        }

        [HttpGet("ClustersUpd")]
        [Admin]
        public IActionResult ClustersUpd()
        {
            var result = CandlesHub.ClustersUpd.Keys.ToList();
            return Ok(result);
        }

        [HttpGet("PaymentTable")]
        [Admin]
        public async Task<IActionResult> PaymentTable()
        {
            var result = await _adminService.GetPaymentTableAsync();
            return Ok(result);
        }

        [HttpGet("TotalPays")]
        [Admin]
        public async Task<IActionResult> TotalPays(string username)
        {
            var filtered = await _adminService.GetTotalPaysAsync(username);
            return Ok(filtered);
        }

        [HttpGet("ActiveUsers")]
        [Admin]
        public async Task<IActionResult> ActiveUsers()
        {
            var filtered = await _adminService.GetActiveUsersAsync();
            return Ok(filtered);
        }

        internal static DateTime? ProxyEnabledUntil;
        /// <summary>
        /// Включить прокси-режим: следующие 2 минуты всё приложение будет отдавать контент с ru-ticker.com
        /// </summary>
        [HttpGet("EnableRuTickerProxy")]
        [Admin]
        public IActionResult EnableRuTickerProxy()
        {
            ProxyEnabledUntil = DateTime.UtcNow.AddMinutes(2);
            return Ok(new
            {
                message = "Прокси включён",
                until = ProxyEnabledUntil.Value.ToString("o")
            });
        }
    }
}
