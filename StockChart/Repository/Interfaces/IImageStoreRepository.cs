using StockChart.Model;

namespace StockChart.Repository.Interfaces
{
    public interface IImageStoreRepository
    {
        public Task<string> UploadBlob(ApplicationUser LoggedInUser, string blob);
        public Task<string> ShareImage(ApplicationUser LoggedInUser, string? name, IFormFile UploadedFile);
        public Task<string> ConvertFromBlob(ApplicationUser LoggedInUser, string convert);
    }
}