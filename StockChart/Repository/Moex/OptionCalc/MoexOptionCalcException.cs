using System;
using System.Net;

namespace StockChart.Repository.Moex.OptionCalc
{
    /// <summary>
    /// Exception thrown when MOEX option-calc returns a non-success response.
    /// </summary>
    public sealed class MoexOptionCalcException : Exception
    {
        public HttpStatusCode StatusCode { get; }

        public MoexOptionCalcException(HttpStatusCode statusCode, string message)
            : base($"MOEX option-calc API failed ({(int)statusCode}): {message}")
        {
            StatusCode = statusCode;
        }
    }
}
