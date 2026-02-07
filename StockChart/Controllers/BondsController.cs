using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers;

[ApiController]
[Route("api/bonds")]
public sealed class BondsController : ControllerBase
{
    private readonly IBondsQueryService _bondsQueryService;

    public BondsController(IBondsQueryService bondsQueryService)
    {
        _bondsQueryService = bondsQueryService;
    }

    [HttpGet("list")]
    public async Task<ActionResult<BondListResponseDto>> GetList([FromQuery] BondsListRequestDto request, CancellationToken cancellationToken)
    {
        var response = await _bondsQueryService.GetListAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("map")]
    public async Task<ActionResult<List<BondMapPointDto>>> GetMap([FromQuery] BondsListRequestDto request, CancellationToken cancellationToken)
    {
        var response = await _bondsQueryService.GetListAsync(request, cancellationToken);
        return Ok(response.MapPoints);
    }

    [HttpGet("{secIdOrIsin}")]
    public async Task<ActionResult<BondDetailsResponseDto>> GetDetails(string secIdOrIsin, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(secIdOrIsin))
        {
            return BadRequest("secIdOrIsin is required.");
        }

        var response = await _bondsQueryService.GetDetailsAsync(secIdOrIsin, cancellationToken);
        if (response == null)
        {
            return NotFound();
        }

        return Ok(response);
    }
}
