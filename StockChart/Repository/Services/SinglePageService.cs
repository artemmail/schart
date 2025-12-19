using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;

public class SinglePageService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ApplicationDbContext2 _context;

    public SinglePageService(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, StockProcContext context)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _context = context;
    }

    public async Task<bool> GetSinglePageAsync()
    {
        if (!_signInManager.IsSignedIn(_signInManager.Context.User))
        {
            return true;
        }

        var user = await _userManager.GetUserAsync(_signInManager.Context.User);
        if (user == null)
        {
            return true;
        }

        var singlePageTable = await _context.SinglePageTable
                                            .FirstOrDefaultAsync(s => s.UserId == user.Id);

        return singlePageTable?.SinglePage ?? true;
    }

    public async Task<bool> ToggleSinglePageAsync()
    {
        if (!_signInManager.IsSignedIn(_signInManager.Context.User))
        {
            return false;
        }

        var user = await _userManager.GetUserAsync(_signInManager.Context.User);
        if (user == null)
        {
            return false;
        }

        var singlePageTable = await _context.SinglePageTable
                                            .FirstOrDefaultAsync(s => s.UserId == user.Id);

        if (singlePageTable == null)
        {
            singlePageTable = new SinglePageTable
            {
                UserId = user.Id,
                SinglePage = false
            };

            _context.SinglePageTable.Add(singlePageTable);
        }
        else
        {
            singlePageTable.SinglePage = !singlePageTable.SinglePage;
        }

        await _context.SaveChangesAsync();
        return singlePageTable.SinglePage;
    }
}
