using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using System.Collections.Concurrent;
using System.Text;

namespace StockChart.Repository
{
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
            using (var dbContext = new ApplicationDbContext())
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
                        throw new Exception($"Тикер {token} не найден.");
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
                        throw new Exception($"Тикер {token} не найден.");
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
                                         && t.Length == 4 && tickers[t].Market == 1);

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
