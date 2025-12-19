using Microsoft.AspNetCore.Mvc.Rendering;
namespace StockChart.Extentions
{
    public struct OptionItem<T>
    {
        public T Value { get; set; }
        public string Text { get; set; }
        public OptionItem(T Value, string Text)
        {
            this.Value = Value;
            this.Text = Text;
        }
    };
    public class OptionsItems<T> : List<OptionItem<T>>
    {
        public void Add(T Value, string Text)
        {
            Add(new OptionItem<T>(Value, Text));
        }
        public List<SelectListItem> GetSelectedList(T selected)
        {
            var res = new List<SelectListItem>();
            foreach (var val in this)
                res.Add(new SelectListItem { Text = val.Text, Value = val.Value.ToString(), Selected = val.Value.Equals(selected) });
            return res;
        }
    }
}
