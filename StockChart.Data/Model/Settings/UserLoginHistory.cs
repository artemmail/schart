using System.ComponentModel.DataAnnotations.Schema;

namespace StockChart.Model.Settings
{

    [Table("UserLoginHistory")]
    public class UserLoginHistory
    {
        public Guid Id { get; set; }

        [ForeignKey("AspNetUser")]
        public Guid UserId { get; set; }

        public DateTime LoginTime { get; set; }

        public string IpAddress { get; set; }

        public string UserAgent { get; set; }

        public string Location { get; set; }

        public virtual ApplicationUser User { get; set; }
    }
}
