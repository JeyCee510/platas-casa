'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const COLORS = ['#9BD8F4', '#C9F0D5', '#F5C6BA', '#FBE8A6', '#C7C0F4', '#F5C2E6', '#B7EDE6'];

export function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
          <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" tick={{ fontSize: 12, fontWeight: 700, fill: '#0A0A0A' }} />
          <YAxis tick={{ fontSize: 12, fontWeight: 700, fill: '#0A0A0A' }} />
          <Tooltip
            contentStyle={{ border: '3px solid #0A0A0A', borderRadius: 8, boxShadow: '4px 4px 0 0 #0A0A0A', background: 'white', fontWeight: 700 }}
            formatter={(v: number) => `$${v.toFixed(2)}`}
          />
          <Bar dataKey="value" stroke="#0A0A0A" strokeWidth={3}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
