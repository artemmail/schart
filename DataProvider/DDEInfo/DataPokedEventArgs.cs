// Decompiled with JetBrains decompiler
// Type: DDEInfo.DataPokeddEventArgs
// Assembly: DDEInfo, Version=1.0.3568.24078, Culture=neutral, PublicKeyToken=null
// MVID: 5CBC33B0-916C-449C-8C2C-F13FA720A9EC
// Assembly location: D:\DdeExportSample\DdeExportSample\Программа\ConsoleApplication1\bin\Debug\DDEInfo.dll
using NDde.Server;
using System;
namespace DDEInfo
{
  public class DataPokedEventArgs
  {
    private DdeConversation m_conversation = (DdeConversation) null;
    private string m_item = string.Empty;
    private object[][] m_cells;
    public DdeConversation Conversation
    {
      get
      {
        return this.m_conversation;
      }
    }
    public string Service
    {
      get
      {
        return this.m_conversation == null ? string.Empty : this.m_conversation.Service;
      }
    }
    public string Topic
    {
      get
      {
        return this.m_conversation == null ? string.Empty : this.m_conversation.Topic;
      }
    }
    public string Item
    {
      get
      {
        return this.m_item;
      }
    }
    public IntPtr Handle
    {
      get
      {
        return this.m_conversation == null ? IntPtr.Zero : this.m_conversation.Handle;
      }
    }
    public string HandleAsAtring
    {
      get
      {
        return this.m_conversation == null ? string.Empty : this.m_conversation.Handle.ToString();
      }
    }
    public object[][] Cells
    {
      get
      {
        return this.m_cells;
      }
    }
    public DataPokedEventArgs(DdeConversation theDdeConversation, string theItem, object[][] theCells)
    {
      this.m_conversation = theDdeConversation;
      this.m_item = theItem;
      this.m_cells = theCells;
    }
  }
}
