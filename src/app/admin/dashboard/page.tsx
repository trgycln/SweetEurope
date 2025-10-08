// src/app/admin/dashboard/page.tsx

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { FiDollarSign, FiTrendingUp, FiPackage, FiAlertTriangle, FiUsers, FiClipboard, FiPlus, FiBriefcase } from 'react-icons/fi';
import Link from 'next/link';
import { Enums } from '@/lib/supabase/database.types';
import { dictionary } from '@/dictionaries/de';

type ReportData = {
    totalRevenue: number;
    netProfit: number;
};

const StatCard = ({ title, value, icon, link }: { title: string, value: string | number, icon: React.ReactNode, link?: string }) => {
    const content = (
        <>
            <div className="flex-shrink-0">{icon}</div>
            <div>
                <p className="text-sm font-medium text-text-main/70">{title}</p>
                <p className="text-3xl font-bold text-primary mt-1">{value}</p>
            </div>
        </>
    );
    if (link) {
        return <Link href={link} className="bg-white p-6 rounded-2xl shadow-lg flex items-center gap-4 hover:bg-bg-subtle transition-colors">{content}</Link>;
    }
    return <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center gap-4">{content}</div>;
};

const QuickActionButton = ({ label, icon, href }: { label: string, icon: React.ReactNode, href: string }) => (
    <Link href={href} className="bg-accent text-white p-4 rounded-lg flex flex-col items-center justify-center text-center font-bold text-sm hover:bg-opacity-90 transition-opacity">
        {icon}
        <span className="mt-2">{label}</span>
    </Link>
);

async function ManagerDashboard() {
    const supabase = createSupabaseServerClient();
    // DÜZELTME: 'dashboardPage' zu 'dashboard' geändert, um mit de.ts übereinzustimmen
    const content = dictionary.dashboard;
    
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [
        pnlRes,
        ordersRes,
        stockRes,
        tasksRes
    ] = await Promise.all([
        supabase.rpc('get_pl_report', { start_date: startDate, end_date: endDate }).returns<ReportData>().single(),
        supabase.from('siparisler').select('id', { count: 'exact' }).in('siparis_statusu', ['Beklemede', 'Hazırlanıyor']),
        supabase.rpc('get_kritik_stok_count'),
        supabase.from('gorevler').select('id', { count: 'exact' }).eq('tamamlandi', false).lt('son_tarih', new Date().toISOString())
    ]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
    const pnlData = pnlRes.data;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={content.cardRevenueThisMonth} value={formatCurrency(pnlData?.totalRevenue ?? 0)} icon={<FiDollarSign size={28} className="text-green-500"/>} />
                <StatCard title={content.cardNetProfitThisMonth} value={formatCurrency(pnlData?.netProfit ?? 0)} icon={<FiTrendingUp size={28} className="text-blue-500"/>} />
                <StatCard title={content.cardActiveOrders} value={ordersRes.count ?? 0} icon={<FiPackage size={28} className="text-yellow-500"/>} link="/admin/operasyon/siparisler" />
                <StatCard title={content.cardCriticalStock} value={stockRes.data ?? 0} icon={<FiAlertTriangle size={28} className="text-red-500"/>} link="/admin/operasyon/urunler" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">{content.agendaTitle}</h2>
                    <p className="text-text-main">{tasksRes.count ?? 0} <span className="font-bold text-red-600">{content.overdueTasks}</span></p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">{content.quickActionsTitle}</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <QuickActionButton label={content.actionNewOrder} icon={<FiPackage size={24}/>} href="/admin/crm/firmalar" />
                        <QuickActionButton label={content.actionNewCompany} icon={<FiUsers size={24}/>} href="/admin/crm/firmalar/yeni" />
                        <QuickActionButton label={content.actionNewExpense} icon={<FiBriefcase size={24}/>} href="/admin/idari/finans/giderler" />
                    </div>
                </div>
            </div>
        </div>
    );
}

async function TeamMemberDashboard({ userId }: { userId: string }) {
    const supabase = createSupabaseServerClient();
    // DÜZELTME: 'dashboardPage' zu 'dashboard' geändert
    const content = dictionary.dashboard;
    
    const { data, error } = await supabase.rpc('get_dashboard_summary_for_member', { p_member_id: userId }).single();

    if (error) {
        console.error("Team member dashboard error:", error);
        return <div>{content.errorLoadingTeamDashboard}</div>
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <StatCard title={content.cardOpenTasks} value={data?.openTasksCount ?? 0} icon={<FiClipboard size={28} className="text-blue-500"/>} link="/admin/idari/gorevler" />
                <StatCard title={content.cardNewOrdersFromClients} value={data?.newOrdersCount ?? 0} icon={<FiPackage size={28} className="text-green-500"/>} link="/admin/operasyon/siparisler" />
            </div>
             <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">{content.quickAccessTitle}</h2>
                <div className="flex gap-4">
                    <Link href="/admin/crm/firmalar" className="font-bold text-accent hover:underline">{content.linkMyClients}</Link>
                    <Link href="/admin/idari/gorevler" className="font-bold text-accent hover:underline">{content.linkMyTasks}</Link>
                </div>
            </div>
        </div>
    );
}

export default async function AdminDashboardPage() {
    const supabase = createSupabaseServerClient();
    // DÜZELTME: 'dashboardPage' zu 'dashboard' geändert
    const content = dictionary.dashboard;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) notFound();

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    const userRole = profile?.rol;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">
                    {userRole === 'Yönetici' ? content.managerTitle : content.teamMemberTitle}
                </h1>
                <p className="text-text-main/80 mt-1">
                    {userRole === 'Yönetici' ? content.managerSubtitle : content.teamMemberSubtitle}
                </p>
            </header>

            {userRole === 'Yönetici' && <ManagerDashboard />}
            {userRole === 'Ekip Üyesi' && <TeamMemberDashboard userId={user.id} />}
        </div>
    );
}