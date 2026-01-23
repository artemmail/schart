using System;
using System.Collections.Generic;

/// <summary>
/// Default ticker list used when --tickers is not provided.
/// </summary>
public static class DefaultTickers
{
    private static readonly string[] Raw = new[]
    {
        "ABIO", "ABRD", "AFKS", "AFLT", "AKRN", "ALRS", "APRI", "APTK", "AQUA", "ARSA", "ASSB", "ASTR",
        "AVAN", "BANE", "BANEP", "BAZA", "BELU", "BISV", "BLNG", "BRZL", "BSPB", "BSPBP", "CARM",
        "CBOM", "CHGZ", "CHKZ", "CHMF", "CHMK", "CNRU", "CNTL", "CNTLP", "DATA", "DELI", "DIAS",
        "DIOD", "DOMRF", "DVEC", "DZRD", "DZRDP", "EELT", "ELFV", "ELMT", "ENPG", "ETLN", "EUTR",
        "FEES", "FESH", "FIXR", "FLOT", "GAZA", "GAZAP", "GAZP", "GCHE", "GECO", "GEMA", "GEMC",
        "GLRX", "GMKN", "GTRK", "HEAD", "HIMC", "HNFG", "HYDR", "IGST", "IGSTP", "IRAO", "IRKT",
        "IVAT", "JNOS", "JNOSP", "KAZT", "KAZTP", "KBSB", "KCHE", "KCHEP",  "KLSB", "KLVZ",
        "KMAZ", "KMEZ", "KOGK", "KRKN", "KRKNP", "KRKO", "KROT", "KROTP", "KRSB", "KRSBP", "KUZB",
        "KZOS", "KZOSP", "LEAS", "LENT", "LIFE", "LKOH", "LMBZ", "LNZL", "LNZLP", "LSNG", "LSNGP",
        "LSRG", "LVHK", "MAGE", "MAGEP", "MAGN", "MBNK", "MDMG", "MFGS", "MFGSP", "MGKL", "MGNT",
        "MGTS", "MGTSP", "MISB", "MISBP", "MOEX", "MRKC", "MRKK", "MRKP", "MRKS", "MRKU", "MRKV",
        "MRKY", "MRKZ", "MRSB", "MSNG", "MSRS", "MSTT", "MTLR", "MTLRP", "MTSS", "MVID", "NAUK",
        "NFAZ", "NKHP", "NKNC", "NKNCP", "NKSH", "NLMK", "NMTP", "NNSB", "NNSBP", "NSVZ", "NVTK",
        "OGKB", "OKEY", "OMZZ", "OZON", "OZPH", "PAZA", "PHOR", "PIKK", "PLZL", "PMSB", "PMSBP",
        "POSI", "PRFN", "PRMB", "PRMD", "RAGR", "RASP", "RBCM", "RDRB", "RENI", "RGSS", "RKKE",
        "RNFT", "ROLO", "ROSN", "ROST", "RTGZ", "RTKM", "RTKMP", "RTSB", "RTSBP", "RUAL", "RUSI",
        "RZSB", "SAGO", "SAGOP", "SARE", "SAREP", "SBER", "SBERP", "SELG", "SFIN", "SGZH", "SIBN",
        "SLEN", "SMLT", "SNGS", "SNGSP", "SOFL", "SPBE", "STSB", "STSBP", "SVAV", "SVCB", "SVET",
        "SVETP", "T", "TASB", "TASBP", "TATN", "TATNP", "TGKA", "TGKB", "TGKBP", "TGKN", "TNSE",
        "TORS", "TORSP", "TRMK", "TRNFP", "TTLK", "TUZA", "UGLD", "UKUZ", "UNAC", "UNKL", "UPRO",
        "URKZ", "USBN", "UTAR", "UWGN", "VGSB", "VGSBP", "VJGZ", "VJGZP", "VKCO",
        "VLHZ", "VRSB", "VRSBP", "VSEH", "VSMO", "VSYD", "VSYDP", "VTBR", "WUSH",
        "X5", "YAKG", "YDEX", "YKEN", "YKENP", "YRSB", "YRSBP", "ZAYM", "ZILL", "ZVEZ"
    };

    public static readonly IReadOnlyList<string> Items = Filter(Raw);

    private static IReadOnlyList<string> Filter(IEnumerable<string> source)
    {
        var all = new List<string>(source);
        var set = new HashSet<string>(all, StringComparer.OrdinalIgnoreCase);
        var filtered = new List<string>(all.Count);

        foreach (var ticker in all)
        {
            if (ticker.EndsWith("P", StringComparison.OrdinalIgnoreCase))
            {
                var baseTicker = ticker.Substring(0, ticker.Length - 1);
                if (set.Contains(baseTicker))
                {
                    continue;
                }
            }

            filtered.Add(ticker);
        }

        return filtered;
    }
}
