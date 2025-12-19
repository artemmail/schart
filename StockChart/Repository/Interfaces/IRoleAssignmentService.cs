using StockChart.Model;
using System.Security.Claims;

namespace StockChart.Repository.Interfaces
{
    public interface IRoleAssignmentService
    {
        public  Task AssignRolesAsync(ClaimsIdentity identity, ApplicationUser user);
    }
}
