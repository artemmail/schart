using System.ComponentModel;

namespace StockChart.Model.Payments
{
    public class ApplicationUserModel
    {
        public Guid Id { get; set; }       
        [DisplayName("Логин")]
        public string? UserName { get; set; }        
        [DisplayName("Email")] 
        public string? Email { get; set; }        
        [DisplayName("RegistrationDate")]
        public DateTime RegistrationDate { get; set; }

        [DisplayName("EmailConfirmed")]
        public bool EmailConfirmed { get; set; }


    }

}
