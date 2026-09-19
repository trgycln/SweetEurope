'use client';

import React, { useState, useMemo } from 'react';
import { FiMessageSquare, FiCpu, FiClock, FiTool, FiSearch, FiFilter, FiDatabase, FiTerminal, FiInfo } from 'react-icons/fi';

type LogEntry = {
  id: string;
  created_at: string;
  channel: string;
  user_message: string;
  ai_response: string;
  tools_used: any;
};

interface AILogsClientProps {
  initialLogs: LogEntry[];
}

export default function AILogsClient({ initialLogs }: AILogsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(initialLogs.length > 0 ? initialLogs[0].id : null);

  // Extract unique channels for the filter
  const channels = useMemo(() => {
    const uniqueChannels = new Set(initialLogs.map(log => log.channel));
    return ['all', ...Array.from(uniqueChannels)];
  }, [initialLogs]);

  // Filter logs based on search and channel
  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      const matchesChannel = selectedChannel === 'all' || log.channel === selectedChannel;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm || 
        (log.user_message && log.user_message.toLowerCase().includes(searchLower)) ||
        (log.ai_response && log.ai_response.toLowerCase().includes(searchLower)) ||
        (log.channel.toLowerCase().includes(searchLower));
      return matchesChannel && matchesSearch;
    });
  }, [initialLogs, searchTerm, selectedChannel]);

  const selectedLog = useMemo(() => {
    return initialLogs.find(log => log.id === selectedLogId) || null;
  }, [initialLogs, selectedLogId]);

  const formatChannelName = (channel: string) => {
    if (channel === 'all') return 'Tümü';
    if (channel.startsWith('board_')) return channel.replace('board_', 'Board: ').toUpperCase();
    return channel.toUpperCase();
  };

  const getChannelIcon = (channel: string) => {
    if (channel === 'whatsapp') return <FiMessageSquare className="w-4 h-4" />;
    return <FiCpu className="w-4 h-4" />;
  };

  const getChannelColor = (channel: string, isSelected: boolean = false) => {
    if (channel === 'whatsapp') return isSelected ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (channel.startsWith('board_')) return isSelected ? 'bg-blue-600 text-white border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200';
    if (channel === 'all') return isSelected ? 'bg-slate-800 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
    return isSelected ? 'bg-slate-700 text-white border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[600px] flex flex-col bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm m-4 sm:m-6 lg:m-8 max-w-[1600px] mx-auto">
      {/* Top Bar: Header & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 text-white rounded-xl shadow-sm">
            <FiTerminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Log Explorer</h1>
            <p className="text-xs text-slate-500 font-medium">Yapay Zeka İzleme (Trace Viewer)</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-[250px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Loglarda arama yap..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-slate-200/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto custom-scrollbar-hide">
            {channels.map(channel => (
              <button
                key={channel}
                onClick={() => setSelectedChannel(channel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${getChannelColor(channel, selectedChannel === channel)} whitespace-nowrap`}
              >
                {formatChannelName(channel)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Split Pane */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Pane: Master List */}
        <div className="w-full md:w-1/3 lg:w-[30%] border-r border-slate-100 bg-slate-50/30 flex flex-col">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm z-10">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{filteredLogs.length} Kayıt Bulundu</span>
            <FiFilter className="w-4 h-4 text-slate-400" />
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400 space-y-3">
                <FiDatabase className="w-8 h-8 opacity-50" />
                <p className="text-sm font-medium">Arama kriterlerine uygun log bulunamadı.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100/60">
                {filteredLogs.map((log) => {
                  const isSelected = selectedLogId === log.id;
                  return (
                    <button
                      key={log.id}
                      onClick={() => setSelectedLogId(log.id)}
                      className={`w-full text-left p-4 transition-all hover:bg-slate-100/50 ${isSelected ? 'bg-blue-50/40 relative' : ''}`}
                    >
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getChannelColor(log.channel, true)} flex items-center gap-1 shadow-sm`}>
                          {formatChannelName(log.channel)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          <FiClock className="w-3 h-3" />
                          {new Date(log.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-[13px] line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-600 font-medium'}`}>
                        {log.user_message || <span className="italic opacity-50">Sistem tetikleyicisi...</span>}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Detail View */}
        <div className="hidden md:flex flex-col w-2/3 lg:w-[70%] bg-white overflow-hidden relative">
          {selectedLog ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              {/* Detail Header */}
              <div className="px-8 py-5 border-b border-slate-100 bg-white sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl border ${getChannelColor(selectedLog.channel, true)} shadow-sm`}>
                    {getChannelIcon(selectedLog.channel)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 leading-tight">Log Detayı</h2>
                    <p className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1">
                      ID: <span className="text-slate-500 font-semibold">{selectedLog.id}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-semibold text-slate-500">
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <FiClock className="text-blue-500" />
                    {new Date(selectedLog.created_at).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'medium' })}
                  </div>
                </div>
              </div>

              {/* Detail Body */}
              <div className="p-8 space-y-10 flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[length:10px] bg-slate-50/10">
                
                {/* Tools Section */}
                {selectedLog.tools_used && Array.isArray(selectedLog.tools_used) && selectedLog.tools_used.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <FiTool className="w-4 h-4" /> Kullanılan Araçlar (Tools)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedLog.tools_used.map((tool: any, idx: number) => (
                         <span key={idx} className="bg-white text-slate-700 border border-slate-200 text-[13px] px-3.5 py-1.5 rounded-xl font-mono font-bold shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                            {tool}
                         </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <FiMessageSquare className="w-4 h-4 text-slate-400" /> Kullanıcı / Tetikleyici Girdisi
                  </h3>
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200" />
                    <p className="text-slate-800 text-[15px] font-medium leading-relaxed whitespace-pre-wrap pl-2">
                      {selectedLog.user_message || <span className="italic text-slate-400">Boş girdi...</span>}
                    </p>
                  </div>
                </div>

                {/* Output Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <FiCpu className="w-4 h-4 text-blue-500" /> Yapay Zeka Çıktısı (LLM Response)
                  </h3>
                  <div className="bg-blue-50/40 border border-blue-100 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400" />
                    <div className="text-slate-700 text-[15px] font-medium leading-relaxed whitespace-pre-wrap prose prose-slate prose-p:my-2 prose-li:my-1 prose-strong:text-slate-900 max-w-none pl-2">
                      {selectedLog.ai_response}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 bg-slate-50/50">
               <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center rotate-3">
                 <FiInfo className="w-10 h-10 text-blue-300 -rotate-3" />
               </div>
               <p className="text-sm font-bold text-slate-500">Detayını görmek istediğiniz bir log kaydını seçin.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
