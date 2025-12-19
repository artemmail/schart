//using KendoNET.DynamicLinq;
using Microsoft.AspNetCore.Mvc;
using Kendo.Mvc.Extensions;
using Kendo.Mvc.UI;
using StockChart.Model.Payments;
using StockChart.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Linq.Dynamic.Core.Exceptions;
using System.Linq.Dynamic.Core;


namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : Controller
    {
        IUsersRepository _usersRepository;
        public UsersController(IUsersRepository usersRepository)
        {
            _usersRepository = usersRepository;
        }
       
        [Admin]
        [HttpPost("Destroy")]        
        public void Destroy([DataSourceRequest] DataSourceRequest request, [FromForm][Bind(Prefix = "models")] IEnumerable<ApplicationUserModel> models)
        {            
            _usersRepository.Destroy(models.Select(x=>x.Id));
        }

        [Admin]
        [HttpDelete("{id}")]
        public void HttpDelete(Guid id)
        {
            Guid[] ids = { id };
            _usersRepository.Destroy(ids);
        }

        [HttpGet("GetUsers")]
        [Admin]
        public IActionResult GetUsers(
                  [FromQuery] int page = 1,
                  [FromQuery] int pageSize = 20,
                  [FromQuery] string sortField = null,
                  [FromQuery] string sortOrder = null,
                  [FromQuery] string filter = null)
        {
            var query = _usersRepository.GetAll();

            // Применяем фильтрацию
            if (!string.IsNullOrEmpty(filter))
            {
                query = query.Where(u =>
                    u.UserName.Contains(filter) ||
                    u.Email.Contains(filter) ||
                    u.RegistrationDate.ToString().Contains(filter)); // Добавьте другие поля по необходимости
            }

            // Применяем сортировку
            if (!string.IsNullOrEmpty(sortField))
            {
                // Корректируем поле сортировки для связанных свойств, если необходимо
                // Например, если sortField относится к связанному объекту, настройте соответствующим образом
                var sortExpression = $"{sortField} {(sortOrder == "desc" ? "descending" : "ascending")}";
                try
                {
                    query = query.OrderBy(sortExpression);
                }
                catch (ParseException)
                {
                    return BadRequest("Некорректное поле сортировки.");
                }
            }
            else
            {
                // Устанавливаем сортировку по умолчанию, например, по дате регистрации
                query = query.OrderByDescending(u => u.RegistrationDate);
            }

            var totalItems = query.Count();

            // Применяем пагинацию
            var items = query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            // Маппим сущности в модели
            var userModels = items.Select(u => _usersRepository.UserToModel(u));

            var result = new
            {
                items = userModels,
                totalCount = totalItems
            };

            return Ok(result);
        }



        [Admin]
        [HttpPost("Read")]
        public DataSourceResult Read([DataSourceRequest] DataSourceRequest requestModel)
        {            
            var x = _usersRepository
                .GetAll()
                .Select(p => _usersRepository.UserToModel(p));//.ToList();
            return x.ToDataSourceResult(requestModel);
        }

        [Admin]
        [HttpGet("Read")]
        public IActionResult Read([FromQuery] string filter = "")
        {
            var users = _usersRepository.GetAll()
                .Select(user => _usersRepository.UserToModel(user))
                .Where(user => string.IsNullOrEmpty(filter) ||
                               user.UserName.Contains(filter) ||
                               user.Email.Contains(filter))
                .ToList();

            return Ok(users);
        }
    }
}
