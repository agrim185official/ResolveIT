import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { getReportStats, getReportTrends, exportReportCsv, exportReportPdf } from '../../services/api';
import './Reports.css';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const Reports = () => {
    const [stats, setStats] = useState(null);
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsData, trendsData] = await Promise.all([
                getReportStats(),
                getReportTrends()
            ]);
            setStats(statsData);
            setTrends(trendsData);
        } catch (error) {
            console.error('Failed to load reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCsv = async () => {
        setExporting(true);
        try {
            await exportReportCsv();
        } catch (error) {
            console.error('CSV export failed:', error);
            alert('Failed to export CSV');
        } finally {
            setExporting(false);
        }
    };

    const handleExportPdf = async () => {
        setExporting(true);
        try {
            await exportReportPdf();
        } catch (error) {
            console.error('PDF export failed:', error);
            alert('Failed to export PDF');
        } finally {
            setExporting(false);
        }
    };

    // Transform data for charts
    const statusData = stats?.byStatus ? Object.entries(stats.byStatus).map(([name, value]) => ({ name: name.replace('_', ' '), value })) : [];
    const categoryData = stats?.byCategory ? Object.entries(stats.byCategory).map(([name, value]) => ({ name, value })) : [];
    const priorityData = stats?.byPriority ? Object.entries(stats.byPriority).map(([name, value]) => ({ name, value })) : [];

    if (loading) {
        return <div className="reports-loading">Loading reports...</div>;
    }

    return (
        <div className="reports-container">
            <div className="reports-header">
                <h2>📊 Reports & Analytics</h2>
                <div className="export-buttons">
                    <button className="export-btn csv" onClick={handleExportCsv} disabled={exporting}>
                        📑 Export CSV
                    </button>
                    <button className="export-btn pdf" onClick={handleExportPdf} disabled={exporting}>
                        📄 Export PDF
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="stats-cards">
                <div className="stat-card total">
                    <span className="stat-value">{stats?.totalComplaints || 0}</span>
                    <span className="stat-label">Total Complaints</span>
                </div>
                <div className="stat-card resolved">
                    <span className="stat-value">{stats?.resolvedCount || 0}</span>
                    <span className="stat-label">Resolved</span>
                </div>
                <div className="stat-card pending">
                    <span className="stat-value">{stats?.pendingCount || 0}</span>
                    <span className="stat-label">Pending</span>
                </div>
                <div className="stat-card escalated">
                    <span className="stat-value">{stats?.escalatedCount || 0}</span>
                    <span className="stat-label">Escalated</span>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                {/* Status Pie Chart */}
                <div className="chart-card">
                    <h3>Complaints by Status</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Pie Chart */}
                <div className="chart-card">
                    <h3>Complaints by Category</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Priority Bar Chart */}
                <div className="chart-card">
                    <h3>Complaints by Priority</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={priorityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Trends Line Chart */}
                <div className="chart-card wide">
                    <h3>Complaints Over Time (Last 30 Days)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="date" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Reports;
