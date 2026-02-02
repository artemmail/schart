public struct DateTimePair
{
    public DateTime Start;
    public DateTime End;

    public DateTimePair(DateTime startDate, DateTime endDate)
    {
        Start = startDate;
        End = endDate;
    }

    public DateTimePair(DateTime? startDate, DateTime? endDate)
    {
        Start = startDate ?? DateTime.Now.Date - TimeSpan.FromDays(7);
        End = endDate ?? DateTime.Now.Date + TimeSpan.FromDays(1);
        if (Start.Date == Start || End.Date == End)
        {
            End += TimeSpan.FromDays(1);
            return;
        }

        if (End.Second == 0 && End.Millisecond == 0)
        {
            End += TimeSpan.FromMinutes(1);
        }
    }
}
