using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ShotsController : Controller
    {
        public UserManager<ApplicationUser> UserManager;
        StockProcContext dbContext;
        IImageStoreRepository _imageStoreRepository;

        public ShotsController(
            StockProcContext dbContext,
            UserManager<ApplicationUser> userManager,
            IImageStoreRepository imageStoreRepository
            )
        {
            _imageStoreRepository = imageStoreRepository;
            this.dbContext = dbContext;
            this.UserManager = userManager;
        }

        [HttpPost]
        [Route("UploadPng")]
        public async Task<string> UploadPngAsync([FromForm] IFormCollection form)
        {
            return await _imageStoreRepository.UploadBlob(await UserManager.GetUserAsync(base.User), form["blob"]);
        }


        [HttpPost]
        [Route("upload")]
        ///  [Authorize]
        public async Task<string> OnPostAsync(string? name, [FromForm] IFormCollection form)
        {
            return await _imageStoreRepository.ShareImage(await UserManager.GetUserAsync(base.User), name, form.Files[0]);
        }


        [HttpGet("{filename}")]
        public IActionResult Get(string filename)
        {
            var x = dbContext.FileEntities.FirstOrDefault(x => x.FileName == filename);
            if (x != null)
            {
                x.OpenTime = DateTime.Now;
                x.DownLoads = x.DownLoads + 1;
                dbContext.Update(x);
                dbContext.SaveChanges();
                byte[] fileBytes = x.FileData;
                string contentType = filename.Contains(".png") ? "image/png" : filename.Contains(".webp") ? "image/webp" : "image/jpeg";
                return File(fileBytes, contentType);
            }
            return NotFound();
        }

    }
}
