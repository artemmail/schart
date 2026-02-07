using System.ComponentModel;
using System.Windows.Media;
using ATAS.Indicators;
using ATAS.Indicators.Drawing;

namespace ATAS.Indicators.Technical
{
    /// <summary>
    /// Накопленная средняя цена, взвешенная дельтой ОИ
    /// по всем уже ЗАКРЫТЫМ барам.
    ///
    /// Для бара i (i >= 1):
    ///   mid(i)   = (Open(i) + Close(i)) / 2
    ///   dOI(i)   = OI(i) - OI(i - 1)
    ///
    ///   V(i)     = V(i - 1) + dOI(i) * mid(i)
    ///   SumOI(i) = SumOI(i - 1) + dOI(i)
    ///
    ///   Z(i)     = V(i) / SumOI(i), если SumOI(i) != 0
    ///            = Z(i - 1), если SumOI(i) == 0
    ///
    /// В РЕАЛЬНОМ ВРЕМЕНИ:
    ///   - последний бар (CurrentBar - 1) считается НЕЗАКРЫТЫМ,
    ///   - по нему линия = значение предыдущего бара,
    ///   - в расчёт накопителей он не входит, пока не закроется.
    /// </summary>
    [DisplayName("MidPrice OI CumWeighted (Close only)")]
    public class MidPriceOiCumWeighted : Indicator
    {
        private readonly ValueDataSeries _lineSeries;

        private Color _lineColor = Color.FromRgb(128, 128, 255);
        private int _lineWidth = 2;

        // кумулятивы по закрытым барам
        private decimal _cumV;
        private decimal _cumOiDelta;

        [DisplayName("Color")]
        [Category("MidPrice_Line")]
        public Color LineColor
        {
            get => _lineColor;
            set
            {
                _lineColor = value;
                if (_lineSeries != null)
                    _lineSeries.Color = _lineColor;
            }
        }

        [DisplayName("Width")]
        [Category("MidPrice_Line")]
        public int LineWidth
        {
            get => _lineWidth;
            set
            {
                _lineWidth = value;
                if (_lineSeries != null)
                    _lineSeries.Width = _lineWidth;
            }
        }

        public MidPriceOiCumWeighted()
        {
            
            _lineSeries = new ValueDataSeries("MidPrice_Line")
            {
                VisualType = VisualMode.Line,
                Color = _lineColor,
                Width = _lineWidth
            };

            DataSeries.Add(_lineSeries);
        }

        protected override void OnCalculate(int bar, decimal value)
        {
            // Полный пересчёт истории – сброс накопителей на первом баре
            if (bar == 0)
            {
                _cumV = 0m;
                _cumOiDelta = 0m;

                _lineSeries[bar] = 0m; // по договорённости – с первой не рисуем
                return;
            }

            // Последний бар на графике считаем НЕЗАКРЫТЫМ:
            // пока он формируется, просто тянем предыдущее значение
            // и не включаем его в расчёт V и SumOI.
            if (bar == CurrentBar - 1)
            {
                _lineSeries[bar] = _lineSeries[bar - 1];
                return;
            }

            // Здесь бар гарантированно "исторический" (закрытый)
            var curr = GetCandle(bar);
            var prev = GetCandle(bar - 1);

            // средняя цена текущего бара
            var midPrice = (curr.Open + curr.Close) / 2m;

            // дельта ОИ: OI_close(i) - OI_close(i-1)
            var dOi = curr.OI - prev.OI;

            // накапливаем только по закрытым барам
            _cumV += dOi * midPrice;
            _cumOiDelta += dOi;

            decimal z;

            if (_cumOiDelta == 0m)
            {
                // если суммарная дельта обнулилась – тянем прошлое значение
                z = _lineSeries[bar - 1];
            }
            else
            {
                z = _cumV / _cumOiDelta;
            }

            _lineSeries[bar] = z;
        }
    }
}