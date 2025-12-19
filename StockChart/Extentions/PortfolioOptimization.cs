/*==============================================================================
// Copyright © Microsoft Corporation.  All Rights Reserved.
// This code released under the terms of the 
// Microsoft Public License (MS-PL, http://opensource.org/licenses/ms-pl.html.)
==============================================================================*/
// 
//
// <summary>
// This file implements a sample portfolio management
// </summary>
//---------------------------------------------------------------------


namespace StockProject.PortfolioOptimization
{
    using Microsoft.SolverFoundation.Common;
    using Microsoft.SolverFoundation.Services;
    using Microsoft.SolverFoundation.Solvers;
    //  using Microsoft.Z3;

    using StockChart.Model;
    using System;
    using System.Collections.Generic;

    /// <summary> Historical data for the 5 stocks in the sample
    /// </summary>
    /// 
    class result
    {
        public double Actual;
        public double StdDev;
        public double[] Mas;
        public result(int size)
        {
            Mas = new double[size];
        }
    }
    internal class MarkowitzPortfolio
    {
        /// <summary> Names of columns in source table
        /// </summary>
        public String[] StockNames = new String[] { };
        private double[] _means;
        private double[,] _covariance;
        /// <summary> The Markowitz model uses a table of regression coefficients
        ///           which are the quadratic section of the model
        /// </summary>
        public result BuildCovariance(List<List<Candle>> res, double risk)
        {
            BuildCovarianceDouble(can2doub(res));
            return BuildRiskModel(risk);
        }

        public double[][] can2doub(List<List<Candle>> res)
        {
            double[][] hdata = new double[res.Count][];
            var min = res.Min(a => a.Count);
            for (int i = 0; i < res.Count; i++)
            {
                hdata[i] = new double[min - 1];
                for (int j = 0; j < min - 1; j++)
                    hdata[i][j] = (double)(res[i][j + 1].ClsPrice / res[i][j].ClsPrice - 1);
            }

            return hdata;
        }

        public void BuildCovarianceDouble(double[][] historicalData)
        {
            int m = StockNames.Length;
            int n = historicalData[0].Length;
            _means = new double[m];
            _covariance = new double[m, m];
            for (int invest = 0; invest < m; invest++)
            {
                double sum = 0;
                for (int t = 0; t < n; t++)
                {
                    sum += historicalData[invest][t];
                }
                _means[invest] = sum / n;
            }
            for (int invest = 0; invest < m; invest++)
            {
                for (int jnvest = 0; jnvest < m; jnvest++)
                {
                    double crossCor = 0;
                    for (int t = n; 0 <= --t;)
                    {
                        crossCor += historicalData[invest][t] * historicalData[jnvest][t];
                    }
                    _covariance[invest, jnvest] = crossCor / n - _means[invest] * _means[jnvest];
                }
            }
        }
        public result BuildRiskModel(double Minimum)
        {
            int m = StockNames.Length;
            InteriorPointSolver solver = new InteriorPointSolver();
            int[] allocations = new int[m];
            for (int invest = 0; invest < m; invest++)
            {
                string name = StockNames[invest];
                solver.AddVariable(name, out allocations[invest]);
                solver.SetBounds(allocations[invest], 0, 1);
            }
            int expectedReturn;
            solver.AddRow("expectedReturn", out expectedReturn);
            // expected return must beat the minimum asked
            solver.SetBounds(expectedReturn, Minimum, double.PositiveInfinity);
            int unity;
            solver.AddRow("Investments sum to one", out unity);
            solver.SetBounds(unity, 1, 1);
            // expected return is a weighted linear combination of investments.
            // unity is a simple sum of the investments
            for (int invest = m; 0 <= --invest;)
            {
                solver.SetCoefficient(expectedReturn, allocations[invest], _means[invest]);
                solver.SetCoefficient(unity, allocations[invest], 1);
            }
            // The variance of the result is a quadratic combination of the covariants and allocations.
            int variance;
            solver.AddRow("variance", out variance);
            for (int invest = m; 0 <= --invest;)
            {
                for (int jnvest = m; 0 <= --jnvest;)
                {
                    solver.SetCoefficient(variance, _covariance[invest, jnvest], allocations[invest], allocations[jnvest]);
                }
            }
            // the goal is to minimize the variance, given the linear lower bound on asked return.
            solver.AddGoal(variance, 0, true);
            InteriorPointSolverParams lpParams = new InteriorPointSolverParams();
            solver.Solve(lpParams);
            if (solver.Result != LinearResult.Optimal)
                return null;
            result p = new result(m);
            for (int invest = m; 0 <= --invest;)
            {
                p.Mas[invest] = (double)solver.GetValue(allocations[invest]);
            }
            p.Actual = (double)solver.GetValue(expectedReturn);
            p.StdDev = Math.Sqrt((double)solver.Statistics.Primal);
            return p;
        }
    }
}
