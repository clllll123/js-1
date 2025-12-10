import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { AgeGroup } from '../types';

interface BusinessChartProps {
  data: any[];
  ageGroup: AgeGroup;
  type: 'profit' | 'trend' | 'turn_breakdown';
}

const BusinessChart: React.FC<BusinessChartProps> = ({ data, ageGroup, type }) => {
  const isJunior = ageGroup === AgeGroup.Junior;

  // Custom Tooltip Styles to match theme context approximately
  const tooltipStyle = isJunior ? 
    { borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: '#1f2937' } : 
    { backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f1f5f9' };

  // Settlement Breakdown Chart
  if (type === 'turn_breakdown') {
      return (
        <div className={`h-full w-full rounded-xl p-2 border ${isJunior ? 'bg-white/50 border-transparent' : 'bg-slate-800 border-slate-700'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isJunior ? "#e5e7eb" : "#334155"} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fill: isJunior ? '#4b5563' : '#94a3b8', fontSize: 12}} />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={tooltipStyle}
                    formatter={(value: any) => [`¥${value}`, '利润']}
                />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
        </div>
      );
  }

  // Trend Chart (Game End)
  if (isJunior) {
    return (
      <div className="h-64 w-full bg-white/50 rounded-xl p-4">
        <h3 className="text-center font-cartoon text-lg text-orange-600 mb-2">我的金币 🪙</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="turn" />
            <YAxis />
            <Tooltip 
                contentStyle={tooltipStyle}
                formatter={(value: any, name: any) => [value, name === 'profit' ? '利润' : name]}
            />
            <Bar dataKey="profit" fill="#FBBF24" radius={[10, 10, 0, 0]} name="利润" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Professional Trend Chart
  return (
    <div className="h-64 w-full bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-pro text-slate-300 mb-4 uppercase tracking-wider">
        {type === 'profit' ? '收入来源分析' : '市场趋势'}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'profit' ? (
             <BarChart data={data}>
             <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
             <XAxis dataKey="turn" stroke="#94a3b8" />
             <YAxis stroke="#94a3b8" />
             <Tooltip 
                 contentStyle={tooltipStyle}
                 formatter={(value: any, name: any) => [value, name === 'revenue' ? '收入' : name === 'cost' ? '成本' : name]}
             />
             <Bar dataKey="revenue" stackId="a" fill="#3b82f6" name="收入" />
             <Bar dataKey="cost" stackId="a" fill="#ef4444" name="成本" />
           </BarChart>
        ) : (
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="turn" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: any) => [value, name === 'profit' ? '利润' : name]}
                />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={{r: 4}} name="利润" />
            </LineChart>
        )}
       
      </ResponsiveContainer>
    </div>
  );
};

export default BusinessChart;