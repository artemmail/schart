using System.Linq;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Moex.OptionCalc;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/option-calc")]
    public sealed class OptionCalcController : ControllerBase
    {
        private readonly IMoexOptionCalcService _optionCalc;
        private readonly IOptionCalcPortfolioBuilder _portfolioBuilder;
        private readonly UserManager<ApplicationUser> _userManager;

        public OptionCalcController(
            IMoexOptionCalcService optionCalc,
            IOptionCalcPortfolioBuilder portfolioBuilder,
            UserManager<ApplicationUser> userManager)
        {
            _optionCalc = optionCalc;
            _portfolioBuilder = portfolioBuilder;
            _userManager = userManager;
        }

        // GET: /api/option-calc/assets?assetType=share&assetSubtype=share&query=GAZP
        [HttpGet("assets")]
        public async Task<ActionResult<IReadOnlyList<AssetDto>>> GetAssets(
            [FromQuery] AssetType? assetType,
            [FromQuery] AssetSubtype? assetSubtype,
            [FromQuery] string? query,
            CancellationToken ct)
        {
            var assets = await _optionCalc.GetAssetsAsync(assetType, assetSubtype, query, ct);
            return Ok(assets);
        }

        // GET: /api/option-calc/optionseries?assetCode=GAZP
        [HttpGet("optionseries")]
        public async Task<ActionResult<IReadOnlyList<OptionSeriesDto>>> GetOptionSeries(
            [FromQuery] string assetCode,
            [FromQuery] AssetType? assetType,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(assetCode))
            {
                return BadRequest("assetCode is required.");
            }

            var series = await _optionCalc.GetOptionSeriesAsync(assetCode.Trim(), assetType, ct);
            return Ok(series);
        }

        // GET: /api/option-calc/optionseries/detail?assetCode=GAZP&optionSeriesCode=GAZP_2026_02
        [HttpGet("optionseries/detail")]
        public async Task<ActionResult<OptionSeriesDto>> GetOptionSeriesDetail(
            [FromQuery] string assetCode,
            [FromQuery] string optionSeriesCode,
            [FromQuery] AssetType? assetType,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(assetCode))
            {
                return BadRequest("assetCode is required.");
            }

            if (string.IsNullOrWhiteSpace(optionSeriesCode))
            {
                return BadRequest("optionSeriesCode is required.");
            }

            var series = await _optionCalc.GetOptionSeriesAsync(assetCode.Trim(), optionSeriesCode.Trim(), assetType, ct);
            return Ok(series);
        }

        // GET: /api/option-calc/options?assetCode=GAZP&expirationDate=2025-12-20&optionType=call
        [HttpGet("options")]
        public async Task<ActionResult<IReadOnlyList<OptionDto>>> GetOptions(
            [FromQuery] string assetCode,
            [FromQuery] AssetType? assetType,
            [FromQuery] DateOnly? expirationDate,
            [FromQuery] OptionSeriesType? seriesType,
            [FromQuery] decimal? strike,
            [FromQuery] OptionType? optionType,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(assetCode))
            {
                return BadRequest("assetCode is required.");
            }

            var options = await _optionCalc.GetOptionsAsync(
                assetCode.Trim(),
                assetType,
                expirationDate,
                seriesType,
                strike,
                optionType,
                ct);

            return Ok(options);
        }

        // GET: /api/option-calc/optionboard?assetCode=GAZP&optionSeriesCode=GAZP_2026_02&rows=12
        [HttpGet("optionboard")]
        public async Task<ActionResult<OptionBoardDto>> GetOptionBoard(
            [FromQuery] string assetCode,
            [FromQuery] string optionSeriesCode,
            [FromQuery] int? rows,
            [FromQuery] AssetType? assetType,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(assetCode))
            {
                return BadRequest("assetCode is required.");
            }

            if (string.IsNullOrWhiteSpace(optionSeriesCode))
            {
                return BadRequest("optionSeriesCode is required.");
            }

            try
            {
                var board = await _optionCalc.GetOptionBoardAsync(assetCode.Trim(), optionSeriesCode.Trim(), assetType, rows, ct);
                return Ok(board);
            }
            catch (MoexOptionCalcException ex)
            {
                return StatusCode((int)ex.StatusCode, ex.Message);
            }
        }

        // GET: /api/option-calc/volatility-graph?assetCode=GAZP&optionSeriesCode=GAZP_2026_02
        [HttpGet("volatility-graph")]
        public async Task<ActionResult<IReadOnlyList<VolatilityGraphPointDto>>> GetVolatilityGraph(
            [FromQuery] string assetCode,
            [FromQuery] string optionSeriesCode,
            [FromQuery] AssetType? assetType,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(assetCode))
            {
                return BadRequest("assetCode is required.");
            }

            if (string.IsNullOrWhiteSpace(optionSeriesCode))
            {
                return BadRequest("optionSeriesCode is required.");
            }

            try
            {
                var points = await _optionCalc.GetVolatilityGraphAsync(assetCode.Trim(), optionSeriesCode.Trim(), assetType, ct);
                return Ok(points);
            }
            catch (MoexOptionCalcException ex)
            {
                return StatusCode((int)ex.StatusCode, ex.Message);
            }
        }

        // GET: /api/option-calc/portfolio/user?portfolioNumber=1&assetCode=GAZP&assetType=share
        [HttpGet("portfolio/user")]
        public async Task<ActionResult<OptionPortfolioRequestDto>> GetUserPortfolio(
            [FromQuery] int portfolioNumber,
            [FromQuery] string assetCode,
            [FromQuery] AssetType? assetType,
            CancellationToken ct)
        {
            if (portfolioNumber < 0 || portfolioNumber > byte.MaxValue)
            {
                return BadRequest("portfolioNumber must be between 0 and 255.");
            }

            if (string.IsNullOrWhiteSpace(assetCode))
            {
                return BadRequest("assetCode is required.");
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var portfolio = await _portfolioBuilder.BuildUserPortfolioAsync(
                (Guid)user.Id,
                (byte)portfolioNumber,
                assetCode,
                assetType,
                ct);

            return Ok(portfolio);
        }

        // POST: /api/option-calc/portfolio/calc
        [HttpPost("portfolio/calc")]
        public async Task<ActionResult<CalculatedPortfolioDto>> CalculatePortfolio(
            [FromBody] OptionPortfolioRequestDto request,
            CancellationToken ct)
        {
            if (!IsValidRequest(request, out var error))
            {
                return BadRequest(error);
            }

            try
            {
                var result = await _optionCalc.CalculatePortfolioAsync(request, ct);
                return Ok(result);
            }
            catch (MoexOptionCalcException ex)
            {
                return StatusCode((int)ex.StatusCode, ex.Message);
            }
        }

        // POST: /api/option-calc/portfolio/graph/{indicator}
        [HttpPost("portfolio/graph/{indicator}")]
        public async Task<ActionResult<IndicatorGraphDto>> GetPortfolioGraph(
            [FromRoute] string indicator,
            [FromBody] OptionPortfolioRequestDto request,
            CancellationToken ct)
        {
            if (!IsValidRequest(request, out var error))
            {
                return BadRequest(error);
            }

            if (!TryParseIndicator(indicator, out var indicatorType))
            {
                return BadRequest("indicator must be one of: pnl, profit_and_loss, delta, gamma, vega, theta, rho.");
            }

            try
            {
                var graph = await _optionCalc.GetPortfolioGraphAsync(indicatorType, request, ct);
                return Ok(graph);
            }
            catch (MoexOptionCalcException ex)
            {
                return StatusCode((int)ex.StatusCode, ex.Message);
            }
        }

        private static bool IsValidRequest(OptionPortfolioRequestDto request, out string error)
        {
            error = string.Empty;
            if (request == null)
            {
                error = "Request body is required.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(request.AssetCode))
            {
                error = "asset_code is required.";
                return false;
            }

            if (request.Positions == null || request.Positions.Count == 0)
            {
                error = "positions are required.";
                return false;
            }

            if (request.Positions.Any(p => string.IsNullOrWhiteSpace(p.SecId)))
            {
                error = "Each position must have a secid.";
                return false;
            }

            return true;
        }

        private static bool TryParseIndicator(string? value, out IndicatorType indicator)
        {
            indicator = IndicatorType.ProfitAndLoss;
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            return value.Trim().ToLowerInvariant() switch
            {
                "pnl" => Return(IndicatorType.ProfitAndLoss, out indicator),
                "profit_and_loss" => Return(IndicatorType.ProfitAndLoss, out indicator),
                "delta" => Return(IndicatorType.Delta, out indicator),
                "gamma" => Return(IndicatorType.Gamma, out indicator),
                "vega" => Return(IndicatorType.Vega, out indicator),
                "theta" => Return(IndicatorType.Theta, out indicator),
                "rho" => Return(IndicatorType.Rho, out indicator),
                _ => false
            };
        }

        private static bool Return(IndicatorType value, out IndicatorType result)
        {
            result = value;
            return true;
        }
    }
}
