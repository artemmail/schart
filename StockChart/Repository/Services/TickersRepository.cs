using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using System.Globalization;
using System.Text;

namespace StockChart.Repository
{
    public class QuickDictionary
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string ShortName { get; set; }
        public string ClassCode { get; set; }
        public string ClassName { get; set; }
        public decimal FaceValue { get; set; }
        public string FaceUnit { get; set; }
        public int Scale { get; set; }
        public int MatDate { get; set; }
        public string IsinCode { get; set; }
        public int LotSize { get; set; }
        public decimal MinPriceStep { get; set; }

        public QuickDictionary(string[] values)
        {
            if (values == null || values.Length < 12)
                throw new ArgumentException("Input array must have at least 12 elements", nameof(values));

            Code = values[0];
            Name = values[1];
            ShortName = values[2];
            ClassCode = values[3];
            ClassName = values[4];
            FaceValue = decimal.Parse(values[5], CultureInfo.InvariantCulture);
            FaceUnit = values[6];
            Scale = int.Parse(values[7], CultureInfo.InvariantCulture);
            MatDate = int.Parse(values[8], CultureInfo.InvariantCulture);
            IsinCode = values[9];
            LotSize = (int)decimal.Parse(values[10], CultureInfo.InvariantCulture);
            MinPriceStep = decimal.Parse(values[11], CultureInfo.InvariantCulture);
        }
    }

    public class TickersRepository : ITickersRepository
    {
        private ConcurrentDictionary<string, Model.Dictionary> tickers;
        private ConcurrentDictionary<int, Model.Dictionary> tickersById;
        private ConcurrentDictionary<byte, Model.Market> markets;

        public ConcurrentDictionary<string, Model.Dictionary> Tickers => tickers;
        public ConcurrentDictionary<int, Model.Dictionary> TickersById => tickersById;
        public ConcurrentDictionary<byte, Model.Market> MarketById => markets;

        public StockChart.Model.Dictionary this[string key] => tickers[key.ToUpper().Trim()];

        public TickersRepository()
        {
            UpdateData();
            using (var dbContext = new StockProcContext())
            {
                markets = new ConcurrentDictionary<byte, Model.Market>(
                    dbContext.Markets
                        .Where(x => x.Visible)
                        .ToDictionary(x => x.Id, x => x));

                tickers = new ConcurrentDictionary<string, Model.Dictionary>(
                    dbContext.Dictionaries
                        .Include(x => x.CategoryType)
                        .Where(x => x.MarketNavigation != null && x.MarketNavigation.Visible)
                        .ToDictionary(x => x.Securityid.ToUpperInvariant(), x => x));

                tickersById = new ConcurrentDictionary<int, Model.Dictionary>(
                    tickers.Values.ToDictionary(x => x.Id, x => x));
            }
        }

        public void UpdateData()
        {
            const string folderPath = @"C:\zip";
            var files = Directory.GetFiles(folderPath, "*lot_size.txt");

            if (files.Any())
            {
                var latestFile = files.OrderByDescending(x => x).First();
                Load(latestFile);
            }

            foreach (var file in files)
                File.Delete(file);
        }

        private DateTime ConvertToDate(int dateInt)
        {
            int year = dateInt / 10000;
            int month = (dateInt / 100) % 100;
            int day = dateInt % 100;

            return new DateTime(year, month, day);
        }

        private bool IsValidDate(int dateInt)
        {
            int year = dateInt / 10000;
            int month = (dateInt / 100) % 100;
            int day = dateInt % 100;

            if (year < 2000 || year > 2040)
                return false;

            if (month < 1 || month > 12)
                return false;

            if (day < 1 || day > 31)
                return false;

            try
            {
                _ = new DateTime(year, month, day);
                return true;
            }
            catch
            {
                return false;
            }
        }

        public void Load(string fileName)
        {
            var quickDict = LoadDictionary(fileName);
            var updatedList = new List<StockChart.Model.Dictionary>();

            using (var dbContext = new StockProcContext())
            {
                var dictionaries = dbContext.Dictionaries.ToArray();
                var classes = dbContext.Classes.ToDictionary(x => x.Name, x => x);

                foreach (var dict in dictionaries)
                {
                    if (quickDict.TryGetValue(dict.Securityid, out var lotInfo))
                    {
                        dict.Minstep = lotInfo.MinPriceStep;
                        dict.ClassName = lotInfo.ClassCode;
                        dict.Shortname = lotInfo.ShortName;
                        dict.Fullname = lotInfo.Name;
                        dict.Scale = lotInfo.Scale;
                        dict.Currency = lotInfo.FaceUnit;
                        dict.Isin = lotInfo.IsinCode;

                        if (IsValidDate(lotInfo.MatDate))
                            dict.ToDate = ConvertToDate(lotInfo.MatDate);

                        dict.Lotsize = lotInfo.LotSize;

                        if (classes.TryGetValue(dict.ClassName, out var classInfo))
                            dict.ClassId = classInfo.Id;

                        updatedList.Add(dict);
                    }
                }

                dbContext.UpdateRange(updatedList);
                dbContext.SaveChanges();
            }
        }

        private Dictionary<string, QuickDictionary> LoadDictionary(string fileName)
        {
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
            var encoding = Encoding.GetEncoding(1251);

            var lines = File.ReadAllLines(fileName, encoding)
                .Skip(1)
                .Where(line => !line.Contains("face_value"))
                .ToArray();

            var quickDictionaries = lines
                .Select(line => new QuickDictionary(line.Split(';')))
                .Where(IsValidQuickDictionary)
                .ToDictionary(x => x.Code, x => x);

            return quickDictionaries;
        }

        private bool IsValidQuickDictionary(QuickDictionary qd)
        {
            if (qd.Code.Contains(".US") || qd.Code.Contains(".SPB"))
                return false;

            var invalidClassCodes = new[] { "RTSIDX", "EQRP_INFO", "SMAL", "SBPND", "BEST" };
            if (invalidClassCodes.Any(code => qd.ClassCode.Contains(code)))
                return false;

            if (qd.ClassName.Contains("SPB:") || qd.ClassName.Contains("Повышенный инвестиционный"))
                return false;

            if (qd.ClassCode.Length == 4 && "YED".Contains(qd.ClassCode.Last()))
                return false;

            return true;
        }

        public string[] TickersFromFormula(string formula)
        {
            // Remove spaces
            string cleanedFormula = formula.Replace(" ", "");

            // Validate characters
            foreach (char c in cleanedFormula)
            {
                if (!char.IsLetterOrDigit(c) && c != '_' && c != '+' && c != '-' && c != '*' && c != '/' && c != '(' && c != ')' && c != '.')
                {
                    throw new Exception("Invalid character in formula.");
                }
            }

            // Check parentheses
            if (!AreParenthesesBalanced(cleanedFormula))
            {
                throw new Exception("Unmatched parentheses in formula.");
            }

            // Tokenize the formula
            List<string> tokens = TokenizeFormula(cleanedFormula);

            // Validate arithmetic expression
            if (!IsValidExpression(tokens))
            {
                throw new Exception("Invalid arithmetic expression.");
            }

            var result = new List<string>();

            foreach (string token in tokens)
            {
                if (IsOperator(token) || token == "(" || token == ")" || IsNumber(token))
                {
                    continue; // Skip operators, parentheses, and numbers
                }
                else
                {
                    // Validate ticker symbols
                    if (!IsTickerSymbolValid(token))
                    {
                        throw new Exception($"Invalid ticker symbol: {token}");
                    }

                    // Correct ticker casing
                    string correctedTicker = CorrectTickerCasing(token);

                    if (correctedTicker != null && !result.Contains(correctedTicker))
                    {
                        result.Add(correctedTicker);
                    }
                    else if (correctedTicker == null)
                    {
                        throw new Exception($"Unknown ticker symbol: {token}");
                    }
                }
            }

            return result.OrderByDescending(s => s.Length).ToArray();
        }

        public string CorrectFormula(string formula)
        {
            // Remove spaces
            string cleanedFormula = formula.Replace(" ", "");

            // Validate characters
            foreach (char c in cleanedFormula)
            {
                const string allowedChars = "_+-*/().";
                if (!char.IsLetterOrDigit(c) && !allowedChars.Contains(c))
                {
                    throw new Exception("Invalid character in formula.");
                }
            }

            // Check parentheses
            if (!AreParenthesesBalanced(cleanedFormula))
            {
                throw new Exception("Unmatched parentheses in formula.");
            }

            // Tokenize the formula
            List<string> tokens = TokenizeFormula(cleanedFormula);

            // Validate arithmetic expression
            if (!IsValidExpression(tokens))
            {
                throw new Exception("Invalid arithmetic expression.");
            }

            StringBuilder correctedFormula = new StringBuilder();

            foreach (string token in tokens)
            {
                if (IsOperator(token) || token == "(" || token == ")" || IsNumber(token))
                {
                    correctedFormula.Append(token);
                }
                else
                {
                    // Correct ticker casing
                    string correctedTicker = CorrectTickerCasing(token);

                    if (correctedTicker != null)
                    {
                        correctedFormula.Append(correctedTicker);
                    }
                    else
                    {
                        throw new Exception($"Unknown ticker symbol: {token}");
                    }
                }
            }

            return correctedFormula.ToString();
        }

        private List<string> TokenizeFormula(string formula)
        {
            List<string> tokens = new List<string>();
            int i = 0;
            while (i < formula.Length)
            {
                char c = formula[i];
                if (char.IsLetter(c) || c == '_')
                {
                    // Start of a ticker symbol
                    int start = i;
                    while (i < formula.Length && (char.IsLetterOrDigit(formula[i]) || formula[i] == '_'))
                    {
                        i++;
                    }
                    tokens.Add(formula.Substring(start, i - start));
                }
                else if (char.IsDigit(c) || (c == '.' && i + 1 < formula.Length && char.IsDigit(formula[i + 1])))
                {
                    // Start of a number (integer or decimal)
                    int start = i;
                    bool hasDecimalPoint = false;
                    while (i < formula.Length && (char.IsDigit(formula[i]) || formula[i] == '.'))
                    {
                        if (formula[i] == '.')
                        {
                            if (hasDecimalPoint)
                            {
                                throw new Exception("Invalid number format.");
                            }
                            hasDecimalPoint = true;
                        }
                        i++;
                    }
                    tokens.Add(formula.Substring(start, i - start));
                }
                else if ("+-*/()".Contains(c))
                {
                    tokens.Add(c.ToString());
                    i++;
                }
                else
                {
                    throw new Exception("Invalid character in formula.");
                }
            }
            return tokens;
        }

        private bool IsValidExpression(List<string> tokens)
        {
            string prevToken = null;

            foreach (string token in tokens)
            {
                if (IsOperator(token))
                {
                    if (prevToken == null || IsOperator(prevToken) || prevToken == "(")
                    {
                        return false; // Operator at start or after operator or '('
                    }
                }
                else if (token == "(")
                {
                    // No specific check needed here
                }
                else if (token == ")")
                {
                    if (prevToken == null || IsOperator(prevToken) || prevToken == "(")
                    {
                        return false; // ')' cannot follow an operator or '('
                    }
                }
                else
                {
                    // Operand (number or ticker)
                    if (prevToken != null && !IsOperator(prevToken) && prevToken != "(")
                    {
                        return false; // Two operands in a row without operator
                    }
                }

                prevToken = token;
            }

            if (tokens.Count > 0 && IsOperator(tokens[^1]))
            {
                return false; // Expression cannot end with an operator
            }

            return true;
        }

        private bool AreParenthesesBalanced(string formula)
        {
            Stack<char> stack = new Stack<char>();
            foreach (char c in formula)
            {
                if (c == '(')
                {
                    stack.Push(c);
                }
                else if (c == ')')
                {
                    if (stack.Count == 0 || stack.Pop() != '(')
                    {
                        return false;
                    }
                }
            }
            return stack.Count == 0;
        }

        private bool IsOperator(string token)
        {
            return token == "+" || token == "-" || token == "*" || token == "/";
        }

        private bool IsNumber(string token)
        {
            return decimal.TryParse(token, out _);
        }

        private bool IsTickerSymbolValid(string ticker)
        {
            foreach (char c in ticker)
            {
                if (!char.IsLetterOrDigit(c) && c != '_')
                {
                    return false;
                }
            }
            return true;
        }

        private string CorrectTickerCasing(string ticker)
        {
            string upperTicker = ticker.ToUpper();

            if (tickers.ContainsKey(upperTicker))
            {
                return tickers[upperTicker].Securityid;
            }
            else if (ticker.Length == 2)
            {
                var matchingTicker = tickers.Keys
                    .FirstOrDefault(t => t.StartsWith(upperTicker)
                                         && t.Length == 4 &&  tickers[t].Market == 1);

                if (matchingTicker != null)
                {
                    return tickers[matchingTicker].Securityid.Substring(0, 2);
                }
            }

            return null; // Ticker not found
        }

        public IEnumerable<Model.Dictionary> findByMask(string mask, int count)
        {
            var upperMask = mask.ToUpper();
            IEnumerable<Model.Dictionary> query;

            if (tickers.Keys.Any(c => c.StartsWith(upperMask)))
            {
                query = tickers.Values
                    .Where(c => c.Securityid.StartsWith(upperMask, StringComparison.OrdinalIgnoreCase));
            }
            else if (tickers.Keys.Any(c => c.Contains(upperMask)))
            {
                query = tickers.Values
                    .Where(c => c.Securityid.Contains(upperMask, StringComparison.OrdinalIgnoreCase));
            }
            else if (tickers.Values.Any(c => !string.IsNullOrWhiteSpace(c.Shortname) && c.Shortname.StartsWith(upperMask, StringComparison.OrdinalIgnoreCase)))
            {
                query = tickers.Values
                    .Where(c => !string.IsNullOrWhiteSpace(c.Shortname) && c.Shortname.StartsWith(upperMask, StringComparison.OrdinalIgnoreCase));
            }
            else
            {
                query = tickers.Values
                    .Where(c => !string.IsNullOrWhiteSpace(c.Shortname) && c.Shortname.Contains(upperMask, StringComparison.OrdinalIgnoreCase));
            }

            return query
                .OrderBy(x => x.Market)
                .OrderBy(x => x.Securityid.Length)
                .Take(count);
        }
    }
}
