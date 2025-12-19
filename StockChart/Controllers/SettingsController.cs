using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using StockChart.Extentions;
using StockChart.Model;
using StockChart.Repository;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly ISettingsRepository _settingsRepository;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly StockProcContext _dbContext;
        private readonly ILogger<SettingsController> _logger;

        public SettingsController(
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            ISettingsRepository settingsRepository,
            StockProcContext dbContext,
            ILogger<SettingsController> logger)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _settingsRepository = settingsRepository;
            _dbContext = dbContext;
            _logger = logger;
        }

        [HttpGet("Get")]
        public async Task<ChartSettingsDTO> Get(int id)
        {
            var user = await _userManager.GetUserAsync(User);

            if (id == 0)
            {
                return new ChartSettingsDTO(await _settingsRepository.GetDefaultSettingsAsync(user, "GAZP"));
            }

            var settings = await _settingsRepository.GetChartSettingsAsync(user, id);
            var result = new ChartSettingsDTO();
            result.CopyToSettingsDTO(settings);
            return result;
        }

        [HttpPost("Post")]
        public async Task<IActionResult> Post(int id)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user != null)
            {
                await _settingsRepository.SaveChartSettingsAsync(user, id);
                return Ok();
            }
            return BadRequest();
        }

        [HttpGet("Presets")]
        public async Task<List<OptionItem<int>>> Presets()
        {
            var user = await _userManager.GetUserAsync(User);
            int index = 0;

            var presets = (await _settingsRepository.GetChartSettingsForUserAsync(user))
                .Select(x => new OptionItem<int> { Text = x.Name, Value = x.Id })
                .ToList();

            return presets;
        }

        public class SettingsModel
        {
            public string? Settings { get; set; }
        }

        [HttpPost("Create")]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] SettingsModel model)
        {
            var user = await _userManager.GetUserAsync(User);
            var settings = JsonConvert.DeserializeObject<ChartSettingsDTO>(model.Settings);
            var createdSettings = await _settingsRepository.CreateChartSettingsAsync(user, settings);
            return Ok(createdSettings.Id);
        }

        [HttpPut]
        [Authorize]
        public async Task<IActionResult> Put([FromBody] ChartSettingsDTO model)
        {
            var user = await _userManager.GetUserAsync(User);
            var updatedSettings = await _settingsRepository.CreateChartSettingsAsync(user, model);
            return Ok(updatedSettings.Id);
        }

        [HttpDelete]
        [Authorize]
        public async Task<IActionResult> Delete([FromBody] ChartSettingsDTO model)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user != null)
            {
                await _settingsRepository.DeleteChartSettingsAsync(user, model);
                var nextSettingsId = (await _settingsRepository.GetChartSettingsForUserAsync(user))
                    .Select(x => x.Id)
                    .FirstOrDefault();
                return Ok(nextSettingsId);
            }
            return BadRequest();
        }

        [HttpPost("Delete")]
        [Authorize]
        public async Task<IActionResult> Delete([FromBody] SettingsModel model)
        {
            var user = await _userManager.GetUserAsync(User);
            var settings = JsonConvert.DeserializeObject<ChartSettingsDTO>(model.Settings);
            await _settingsRepository.DeleteChartSettingsAsync(user, settings);

            var nextSettingsId = (await _settingsRepository.GetChartSettingsForUserAsync(user))
                .Select(x => x.Id)
                .FirstOrDefault();

            return Ok(nextSettingsId);
        }
    }
}
