// Decompiled with JetBrains decompiler
// Type: FTFHelper.XLTable
// Assembly: FTFHelper, Version=1.0.1.3, Culture=neutral, PublicKeyToken=null
// MVID: 81C090DF-560F-4049-B237-25EB7BD6DD64
// Assembly location: D:\DdeExportSample\DdeExportSample\Программа\ConsoleApplication1\bin\Debug\FTFHelper.dll
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
namespace FTFHelper
{
    [StructLayout(LayoutKind.Sequential, Size = 1)]
    public struct PREVIEWVALUE
    {
    }
    public enum eFTFDataBlockType: short
    {
        tdtUnknown = 0,
        tdtFloat = 1,
        tdtString = 2,
        tdtBool = 3,
        tdtError = 4,
        tdtBlank = 5,
        tdtInt = 6,
        tdtSkip = 7,
        tdtTable = 16,
    }
    public class XLTable
    {
        private static int CDBP = -1;
        public static object[][] Cells(byte[] theData, string theCodePageName)
        {
            if (theData==null)
                throw new ArgumentNullException("theData");
            XLTable.CDBP=0;
            List<object> list = new List<object>();
            object[] theItems;
            while (XLTable.CDBP<theData.Length&&eFTFDataBlockType.tdtUnknown!=XLTable.GetData(theData, theCodePageName, out theItems))
                list.AddRange(theItems);
            short num1 = (short)list[0];
            short num2 = (short)list[1];
            if (num1*num2+2!=list.Count)
                throw new Exception("Sequence is corrupted. Parsing was not complited");
            object[][] objArray = new object[num1][];
            for (int index = 0; index<num1; ++index)
            {
                objArray[index]=new object[num2];
                list.CopyTo(index*num2+2, objArray[index], 0, num2);
            }
            return objArray;
        }
        public static object[][] Cells(byte[] theData)
        {
            return XLTable.Cells(theData, "windows-1251");
        }
        private static eFTFDataBlockType GetDataBlockType(byte[] theData, int thePoint)
        {
            int num = BitConverter.ToInt16(theData, thePoint);
            return 16!=num ? (1!=num ? (2!=num ? (3!=num ? (4!=num ? (5!=num ? (6!=num ? (7!=num ? eFTFDataBlockType.tdtUnknown : eFTFDataBlockType.tdtSkip) : eFTFDataBlockType.tdtInt) : eFTFDataBlockType.tdtBlank) : eFTFDataBlockType.tdtError) : eFTFDataBlockType.tdtBool) : eFTFDataBlockType.tdtString) : eFTFDataBlockType.tdtFloat) : eFTFDataBlockType.tdtTable;
        }
        private static eFTFDataBlockType GetData(byte[] theData, string theCodePageName, out object[] theItems)
        {
            byte[] numArray1 = new byte[2];
            theItems=null;
            if (XLTable.CDBP<0||XLTable.CDBP>=theData.Length)
                throw new ArgumentOutOfRangeException("thePoint");
            eFTFDataBlockType dataBlockType = XLTable.GetDataBlockType(theData, XLTable.CDBP);
            if (dataBlockType==eFTFDataBlockType.tdtUnknown)
                return dataBlockType;
            if (XLTable.CDBP==0&&dataBlockType!=eFTFDataBlockType.tdtTable)
                throw new ArgumentException("Unknown FTF Sequence, the 'tdtTable' expected");
            Encoding encoding = Encoding.GetEncoding(theCodePageName);
            int length1 = BitConverter.ToInt16(theData, 2+XLTable.CDBP);
            byte[] bytes = new byte[length1];
            int num1 = 4+length1;
            Array.Copy(theData, 4+XLTable.CDBP, bytes, 0, bytes.Length);
            XLTable.CDBP+=num1;
            switch (dataBlockType)
            {
                case eFTFDataBlockType.tdtFloat:
                    int length2 = length1/8;
                    theItems=new object[length2];
                    for (int index = 0; index<length2; ++index)
                        theItems[index]=BitConverter.ToDouble(bytes, index*8);
                    break;
                case eFTFDataBlockType.tdtString:
                    List<object> list = new List<object>();
                    int index1;
                    int count;
                    for (int index2 = 0; index2<bytes.Length; index2=index1+count)
                    {
                        byte[] numArray2 = numArray1;
                        int index3 = 0;
                        byte[] numArray3 = bytes;
                        int index4 = index2;
                        int num2 = 1;
                        index1=index4+num2;
                        int num3 = numArray3[index4];
                        numArray2[index3]=(byte)num3;
                        count=BitConverter.ToInt16(numArray1, 0);
                        list.Add(encoding.GetString(bytes, index1, count));
                    }
                    theItems=list.ToArray();
                    break;
                case eFTFDataBlockType.tdtBool:
                    int num4 = length1/2;
                    for (int index2 = 0; index2<num4; ++index2)
                        theItems[index2]=BitConverter.ToBoolean(bytes, index2*2);
                    break;
                case eFTFDataBlockType.tdtError:
                    string str = string.Empty;
                    int length3 = length1/2;
                    theItems=new object[length3];
                    for (int index2 = 0; index2<length3; ++index2)
                    {
                        switch (BitConverter.ToInt16(bytes, index2*2))
                        {
                            case 36:
                                str="#NUM";
                                break;
                            case 42:
                                str="#N/A";
                                break;
                            case 23:
                                str="#REF!";
                                break;
                            case 29:
                                str="#NAME";
                                break;
                            case 0:
                                str="#NULL!";
                                break;
                            case 7:
                                str="#DIV/0";
                                break;
                            case 15:
                                str="#VALUE";
                                break;
                        }
                        theItems[index2]=str;
                    }
                    break;
                case eFTFDataBlockType.tdtBlank:
                    int length4 = BitConverter.ToInt16(bytes, 0);
                    theItems=new object[length4];
                    break;
                case eFTFDataBlockType.tdtInt:
                    int length5 = length1/2;
                    theItems=new object[length5];
                    for (int index2 = 0; index2<length5; ++index2)
                        theItems[index2]=BitConverter.ToUInt16(bytes, index2*2);
                    break;
                case eFTFDataBlockType.tdtSkip:
                    int length6 = BitConverter.ToInt16(bytes, 0);
                    theItems=new object[length6];
                    for (int index2 = 0; index2<length6; ++index2)
                        theItems[index2]=new PREVIEWVALUE();
                    break;
                case eFTFDataBlockType.tdtTable:
                    int length7 = 2;
                    theItems=new object[length7];
                    theItems[0]=BitConverter.ToInt16(bytes, 0);
                    theItems[1]=BitConverter.ToInt16(bytes, 2);
                    break;
            }
            return dataBlockType;
        }
    }
}
