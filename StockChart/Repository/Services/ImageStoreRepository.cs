using StockChart.Model;
using StockChart.Repository.Interfaces;
using System.Text.RegularExpressions;

namespace StockChart.Repository
{
    public class ImageStoreRepository : IImageStoreRepository
    {
        private StockProcContext dbContext;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        ITickersRepository _tickers;
        public ImageStoreRepository(StockProcContext dbContext,
            IStockMarketServiceRepository stockMarketServiceRepository,
        ITickersRepository tickers
            )
        {
            _tickers = tickers;
            _stockMarketServiceRepository = stockMarketServiceRepository;
            this.dbContext = dbContext;
        }

        IEnumerable<string> GetImgSrc(string htmlCode)
        {
            List<string> result = new List<string>();
            MatchCollection matches = Regex.Matches(htmlCode, @"<img[^>]*src=""([^""]*)""[^>]*>");
            foreach (Match match in matches)
                yield return match.Groups[1].Value;
        }


        public async Task<string> ConvertFromBlob(ApplicationUser LoggedInUser, string convert)
        {
            string res = convert;

            foreach (var match in GetImgSrc(res).Where(x => x.Contains("data:image")))
            {
                var replace = await UploadBlob(LoggedInUser, match.Split(',')[1]);
                res = res.Replace(match, replace);
            }

            return res;
        }


        public async Task<string> UploadBlob(ApplicationUser LoggedInUser, string blob)
        {
            string fileName = System.IO.Path.GetRandomFileName().Replace('.', 'x') + ".png";
            byte[] b = Convert.FromBase64String(blob);
            var fe = new FileEntity()
            {
                FileName = fileName,
                FileData = b,
                CreatedTime = DateTime.Now,
                OpenTime = DateTime.Now,
                UserId = LoggedInUser != null ? LoggedInUser.Id : null,
            };

            dbContext.Add(fe);
            await dbContext.SaveChangesAsync();
            return $"https://stockchart.ru/shots/{fileName}";
        }

        public async Task<string> ShareImage(ApplicationUser LoggedInUser, string? name, IFormFile UploadedFile)
        {

            var ext = "." + UploadedFile.ContentType.Split('/')[1];

            if (ext.ToUpper() == ".JPEG")
                ext = ".jpg";

            string fileName = System.IO.Path.GetRandomFileName().Replace('.', 'x') + ext;// ".webp";

            if (!string.IsNullOrWhiteSpace(name))
            {
                var n = name.Replace(ext, "") + ext;
                if (!dbContext.FileEntities.Any(x => x.FileName == n))
                    fileName = n;
            }

            using (var memoryStream = new MemoryStream())
            {
                await UploadedFile.CopyToAsync(memoryStream);

                // Доступ к данным файла в виде байтов
                byte[] fileBytes = memoryStream.ToArray();

                var fe = new FileEntity()
                {
                    FileName = fileName,// UploadedFile.FileName,
                    FileData = fileBytes,
                    CreatedTime = DateTime.Now,
                    OpenTime = DateTime.Now,
                    UserId = LoggedInUser != null ? LoggedInUser.Id : null,
                };

                dbContext.Add(fe);
                await dbContext.SaveChangesAsync();
                return $"https://stockchart.ru/shots/{fileName}";
            }
        }

    }
}
