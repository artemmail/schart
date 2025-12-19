using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using StockChart.Extentions;
using StockChart.Model;
using StockChart.Repository;
using System.Drawing;
using System.Security.Claims;
namespace StockChart.Pages.Report
{
    public class TotalVolumeModel : PageModel
    {
        private StockProcContext db;
        ITickersRepository tickers;
    
        public TotalVolumeModel(StockProcContext dbContext,
            ITickersRepository tikers,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            this.tickers = tikers;
            db = dbContext;
        }

        public List<SelectListItem> YearsList;
        public List<SelectListItem> MarketList;
        public List<SelectListItem> GroupList;
        public void OnGet()
        {
            YearsList = Service.years_list();

            int a = 0;
            MarketList = this.tickers.MarketById.Values
                .OrderBy(x => x.Id)
                .Select(x => new SelectListItem() { Text = x.Name, Value = x.Id.ToString(), Selected = a++ == 0 }).ToList();

            /*
            MarketList =
                new List<SelectListItem>() { 
                    new SelectListItem { Selected = false, Text = "ММВБ", Value = "0" }, 
                    new SelectListItem { Selected = false, Text = "FORTS", Value = "1" },
                new SelectListItem { Selected = false, Text = "Валюта", Value = "3" }
                };*/
            GroupList =
                new List<SelectListItem>() {
                    new SelectListItem { Selected = true, Text = "День", Value = "0" },
                    new SelectListItem { Selected = false, Text = "Неделя", Value = "1" },
                    new SelectListItem { Selected = false, Text = "Месяц", Value = "2" },
                    new SelectListItem { Selected = false, Text = "Квартал", Value = "3" },
                    new SelectListItem { Selected = false, Text = "1/2Года", Value = "4" },
                    new SelectListItem { Selected = false, Text = "Год", Value = "5" }
                };
        }
    }
}
