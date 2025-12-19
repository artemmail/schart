using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using StockChart.Data;
using StockChart.Model;

public class DicView
{
    public string SECURITYID { get; set; }
    public byte market { get; set; }
    public int id { get; set; }


    public int lotsize { get; set; }



}

public class MaxNumberForts
{
    public int id { get; set; }
    public long MaxNumber { get; set; }
}





public static class SQLHelper
{
    private static string connectionString;

    public static string ConnectionString
    {
        get => connectionString ?? throw new InvalidOperationException("Connection string is not configured.");
        set => connectionString = value ?? throw new ArgumentNullException(nameof(value));
    }
    public static DataTable DataTableFromQuery(string s)
    {
        using var context = DatabaseContextFactory.CreateStockProcContext(ConnectionString);
        using var command = context.Database.GetDbConnection().CreateCommand();
        command.CommandText = s;
        command.CommandType = CommandType.Text;

        context.Database.OpenConnection();
        try
        {
            using var reader = command.ExecuteReader();
            DataTable dt = new DataTable();
            dt.Load(reader);
            return dt;
        }
        finally
        {
            context.Database.CloseConnection();
        }
    }
    public static object ScalarFromQuery(string s)
    {
        using var context = DatabaseContextFactory.CreateStockProcContext(ConnectionString);
        using var command = context.Database.GetDbConnection().CreateCommand();
        command.CommandText = s;
        command.CommandType = CommandType.Text;

        context.Database.OpenConnection();
        try
        {
            return command.ExecuteScalar();
        }
        finally
        {
            context.Database.CloseConnection();
        }
    }










    public static List<T> ConvertDataTable<T>(DataTable dt)
    {
        var columnNames = dt.Columns.Cast<DataColumn>().Select(c => c.ColumnName).ToList();
        var properties = typeof(T).GetProperties();
        var rows = dt.Rows;
        var alist = new List<T>();
        foreach (DataRow row in rows)
        {
            var obj = Activator.CreateInstance<T>();
            foreach (var pro in properties)
            {
                if (columnNames.Contains(pro.Name))
                {
                    try
                    {
                        pro.SetValue(obj,
                                     pro.PropertyType.IsEnum
                                         ? Enum.ToObject(pro.PropertyType, row[pro.Name])
                                         : row[pro.Name], null);
                    }
                    catch (Exception)
                    {
                    }
                }
            }
            alist.Add(obj);
        }
        return alist;
    }
}
