using System;

namespace DataProvider.Models
{
    public struct Trade
    {
        public Trade() { }
        public Trade(DBRecord record)
        {
            rounddate = record.datetime;
            Price = record.price;
            Volume = record.volume;
            Quantity = record.quantity;
            number = record.number;
            Direction = (byte)record.direction;
            OI = record.OI;
        }
        public DateTime rounddate;
        public Decimal Price;
        public Decimal Volume;
        public Decimal Quantity;
        public long number;
        public byte Direction;
        public int OI;
    }
}
