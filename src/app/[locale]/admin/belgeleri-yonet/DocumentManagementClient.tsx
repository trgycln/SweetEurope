'use client';

import React, { useState, useEffect } from 'react';
import { FiUpload, FiDownload, FiTrash2, FiSearch, FiX, FiChevronDown, FiFilter, FiFile } from 'react-icons/fi';
import { toast } from 'sonner';

interface Document {
    id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    description?: string;
    document_type: 'gelen' | 'giden';
    document_subject?: string;
    sender?: string;
    recipient?: string;
    reference_number?: string;
    document_date?: string;
    tags?: string[];
    created_at: string;
    downloaded_count: number;
}

interface DocumentManagementClientProps {
    locale: string;
    dictionary: any;
}

export function DocumentManagementClient({ locale, dictionary }: { locale: string; dictionary: any }) {
    const dict = dictionary?.adminDashboard?.documentsPage || {};

    const [documents, setDocuments] = useState<Document[]>([]);
    const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        file: null as File | null,
        documentType: 'gelen' as 'gelen' | 'giden',
        description: '',
        documentSubject: '',
        sender: '',
        recipient: '',
        referenceNumber: '',
        documentDate: '',
        tags: '',
    });
    const [filters, setFilters] = useState({
        documentType: '' as '' | 'gelen' | 'giden',
        dateFrom: '',
        dateTo: '',
        sender: '',
        recipient: '',
        referenceNumber: '',
        tags: '',
    });
    const [filterSuggestions, setFilterSuggestions] = useState({
        senders: [] as string[],
        recipients: [] as string[],
        tags: [] as string[],
    });

    useEffect(() => {
        loadDocuments();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [documents, filters, searchTerm]);

    useEffect(() => {
        const sendersSet = new Set<string>();
        const recipientsSet = new Set<string>();
        const tagsSet = new Set<string>();
        documents.forEach(doc => {
            if (doc.sender) sendersSet.add(doc.sender);
            if (doc.recipient) recipientsSet.add(doc.recipient);
            if (doc.tags) doc.tags.forEach(tag => tagsSet.add(tag));
        });
        setFilterSuggestions({
            senders: Array.from(sendersSet).sort(),
            recipients: Array.from(recipientsSet).sort(),
            tags: Array.from(tagsSet).sort(),
        });
    }, [documents]);

    const loadDocuments = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/admin/documents/search');
            const data = await res.json();
            if (data.documents) {
                setDocuments(data.documents);
            }
        } catch (error) {
            console.error('Load documents error:', error);
            toast.error(dict.deleteError || 'Evraklar yüklenemedi');
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = () => {
        let result = documents;
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            result = result.filter(doc =>
                doc.file_name.toLowerCase().includes(searchLower) ||
                doc.document_subject?.toLowerCase().includes(searchLower) ||
                doc.sender?.toLowerCase().includes(searchLower) ||
                doc.recipient?.toLowerCase().includes(searchLower) ||
                doc.reference_number?.toLowerCase().includes(searchLower) ||
                doc.tags?.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }
        if (filters.documentType) {
            result = result.filter(doc => doc.document_type === filters.documentType);
        }
        if (filters.dateFrom) {
            result = result.filter(doc => !doc.document_date || new Date(doc.document_date) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
            result = result.filter(doc => !doc.document_date || new Date(doc.document_date) <= new Date(filters.dateTo));
        }
        if (filters.sender) {
            result = result.filter(doc => doc.sender === filters.sender);
        }
        if (filters.recipient) {
            result = result.filter(doc => doc.recipient === filters.recipient);
        }
        if (filters.referenceNumber) {
            result = result.filter(doc => doc.reference_number?.toLowerCase().includes(filters.referenceNumber.toLowerCase()));
        }
        if (filters.tags) {
            result = result.filter(doc => doc.tags?.some(tag => tag.toLowerCase().includes(filters.tags.toLowerCase())));
        }
        setFilteredDocuments(result);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilters({
            documentType: '',
            dateFrom: '',
            dateTo: '',
            sender: '',
            recipient: '',
            referenceNumber: '',
            tags: '',
        });
    };

    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadForm.file) {
            toast.error(dict.selectFile || 'Lütfen dosya seçin');
            return;
        }
        if (uploadForm.file.size > 50 * 1024 * 1024) {
            toast.error(dict.maxFileSize || 'Dosya boyutu 50 MB\'dan küçük olmalıdır');
            return;
        }
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', uploadForm.file);
            formData.append('documentType', uploadForm.documentType);
            if (uploadForm.description) formData.append('description', uploadForm.description);
            if (uploadForm.documentSubject) formData.append('documentSubject', uploadForm.documentSubject);
            if (uploadForm.sender) formData.append('sender', uploadForm.sender);
            if (uploadForm.recipient) formData.append('recipient', uploadForm.recipient);
            if (uploadForm.referenceNumber) formData.append('referenceNumber', uploadForm.referenceNumber);
            if (uploadForm.documentDate) formData.append('documentDate', uploadForm.documentDate);
            if (uploadForm.tags) formData.append('tags', uploadForm.tags);

            const res = await fetch('/api/admin/documents/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
                throw new Error(errorMsg || 'Yükleme başarısız');
            }

            toast.success(dict.uploadSuccess || 'Evrak başarıyla yüklendi');
            setUploadModalOpen(false);
            setUploadForm({
                file: null,
                documentType: 'gelen',
                description: '',
                documentSubject: '',
                sender: '',
                recipient: '',
                referenceNumber: '',
                documentDate: '',
                tags: '',
            });
            await loadDocuments();
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(dict.uploadError || 'Evrak yüklenemedi');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (docId: string, fileName: string) => {
        try {
            const res = await fetch(`/api/admin/documents/download?id=${docId}`);
            if (!res.ok) throw new Error('İndirme başarısız');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Başarıyla indirildi');
        } catch (error) {
            console.error('Download error:', error);
            toast.error(dict.deleteError || 'İndirme başarısız');
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm(dict.deleteConfirm || 'Bu evrakı silmek istediğinizden emin misiniz?')) return;
        try {
            const res = await fetch(`/api/admin/documents/delete?id=${docId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Silme başarısız');
            toast.success(dict.deleteSuccess || 'Evrak silindi');
            await loadDocuments();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(dict.deleteError || 'Silme işlemi başarısız');
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getActiveFilterCount = () => {
        return Object.values(filters).filter(v => v).length + (searchTerm ? 1 : 0);
    };

    const gelenDocuments = filteredDocuments.filter(doc => doc.document_type === 'gelen');
    const gidenDocuments = filteredDocuments.filter(doc => doc.document_type === 'giden');

    const renderDocumentTable = (documents: typeof filteredDocuments, type: 'gelen' | 'giden') => {
        if (documents.length === 0) {
            return (
                <div className="p-8 text-center">
                    <FiFile className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">
                        {type === 'gelen' ? 'Gelen evrak bulunamadı' : 'Giden evrak bulunamadı'}
                    </p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">{dict.fileName}</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">{dict.documentSubject}</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">{dict.sender}</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">{dict.recipient}</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">{dict.documentDate}</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">{dict.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map((doc) => (
                            <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2.5">
                                    <div className="font-medium text-gray-900 text-sm">{doc.file_name}</div>
                                    {doc.description && (
                                        <div className="text-xs text-gray-500 mt-0.5">{doc.description}</div>
                                    )}
                                    {doc.tags && doc.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                            {doc.tags.map((tag, i) => (
                                                <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-2.5 text-gray-600 text-sm">{doc.document_subject || '-'}</td>
                                <td className="px-4 py-2.5 text-gray-600 text-sm">{doc.sender || '-'}</td>
                                <td className="px-4 py-2.5 text-gray-600 text-sm">{doc.recipient || '-'}</td>
                                <td className="px-4 py-2.5 text-gray-600 text-sm">
                                    {doc.document_date ? new Date(doc.document_date).toLocaleDateString(locale) : '-'}
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleDownload(doc.id, doc.file_name)}
                                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                                            title={dict.download}
                                        >
                                            <FiDownload className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                                            title={dict.delete}
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-6 flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="mt-4 text-gray-600">{dict.uploadError || 'Evraklar yükleniyor...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Header with Upload Button */}
        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <FiFile className="w-6 h-6 text-primary" />
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">{dict.documentManagement}</h1>
                    <p className="text-sm text-gray-500">{dict.manageYourDocuments}</p>
                </div>
            </div>
            <button
                onClick={() => setUploadModalOpen(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
                <FiUpload className="w-4 h-4" />
                {dict.uploadDocument}
            </button>
        </div>

        {/* Search & Filters Section */}
        <div className="bg-white rounded-lg shadow-sm p-4">
            {/* Main Search */}
            <div className="relative mb-3">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder={dict.searchPlaceholder || "Evrak adı, konu, gönderici, alıcı, referans numarası ara..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
            </div>

            {/* Filters Toggle Button */}
            <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-gray-600 hover:text-primary font-medium flex items-center gap-2"
            >
                <FiFilter className="w-4 h-4" />
                {dict.filters} {getActiveFilterCount() > 0 && <span className="bg-primary text-white rounded-full px-2 py-0.5 text-xs ml-1">{getActiveFilterCount()}</span>}
                <span className="ml-1">{showFilters ? '▲' : '▼'}</span>
            </button>

            {/* Filters Grid */}
            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
                    {/* Document Type */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{dict.documentType}</label>
                        <select
                            value={filters.documentType}
                            onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        >
                            <option value="">{dict.all}</option>
                            <option value="gelen">{dict.incomingDocuments || "Gelen Evrak"}</option>
                            <option value="giden">{dict.outgoingDocuments || "Giden Evrak"}</option>
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{dict.dateFrom}</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{dict.dateTo}</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>

                    {/* Sender */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{dict.sender}</label>
                        <input
                            type="text"
                            list="senderList"
                            value={filters.sender}
                            onChange={(e) => setFilters({ ...filters, sender: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            placeholder={dict.sender}
                        />
                        <datalist id="senderList">
                            {filterSuggestions.senders.map((sender, i) => (
                                <option key={i} value={sender} />
                            ))}
                        </datalist>
                    </div>

                    {/* Recipient */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{dict.recipient}</label>
                        <input
                            type="text"
                            list="recipientList"
                            value={filters.recipient}
                            onChange={(e) => setFilters({ ...filters, recipient: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            placeholder={dict.recipient}
                        />
                        <datalist id="recipientList">
                            {filterSuggestions.recipients.map((recipient, i) => (
                                <option key={i} value={recipient} />
                            ))}
                        </datalist>
                    </div>

                    {/* Reference Number */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{dict.referenceNumber}</label>
                        <input
                            type="text"
                            value={filters.referenceNumber}
                            onChange={(e) => setFilters({ ...filters, referenceNumber: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            placeholder={dict.referenceNumber}
                        />
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{dict.documentSubject}</label>
                        <input
                            type="text"
                            value={filters.subject}
                            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            placeholder={dict.documentSubject}
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{dict.tags}</label>
                        <input
                            type="text"
                            list="tagList"
                            value={filters.tags}
                            onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            placeholder={dict.tags}
                        />
                        <datalist id="tagList">
                            {filterSuggestions.tags.map((tag, i) => (
                                <option key={i} value={tag} />
                            ))}
                        </datalist>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="flex items-end">
                        <button
                            onClick={clearFilters}
                            className="w-full px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            {dict.clearFilters}
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Documents Tables - Separated by Type */}
        
        {/* Incoming Documents (Gelen Evrak) */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    📥 {dict.incomingDocuments || 'Gelen Evrak'}
                    <span className="text-blue-600 font-normal">({gelenDocuments.length})</span>
                </h3>
            </div>
            {renderDocumentTable(gelenDocuments, 'gelen')}
        </div>

        {/* Outgoing Documents (Giden Evrak) */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-green-50">
                <h3 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                    📤 {dict.outgoingDocuments || 'Giden Evrak'}
                    <span className="text-green-600 font-normal">({gidenDocuments.length})</span>
                </h3>
            </div>
            {renderDocumentTable(gidenDocuments, 'giden')}
        </div>

        {/* Upload Modal */}
        {uploadModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                        <h3 className="text-lg font-semibold text-gray-800">{dict.uploadDocument}</h3>
                        <button
                            onClick={() => setUploadModalOpen(false)}
                            className="text-gray-400 hover:text-gray-600 text-xl transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleFileUpload} className="p-5 space-y-4">
                        {/* Document Type - REQUIRED */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {dict.documentType} <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={uploadForm.documentType}
                                onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value as any })}
                                required
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            >
                                <option value="">{dict.selectDocumentType || "Evrak türü seçin"}</option>
                                <option value="gelen">{dict.incomingDocuments || "Gelen Evrak"}</option>
                                <option value="giden">{dict.outgoingDocuments || "Giden Evrak"}</option>
                            </select>
                        </div>

                        {/* File Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {dict.selectFile} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="file"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setUploadForm({ ...uploadForm, file });
                                }}
                                required
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-white file:cursor-pointer hover:file:opacity-90"
                            />
                            <p className="text-xs text-gray-500 mt-1">{dict.maxFileSize || "Maximum 50MB"}</p>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {dict.documentSubject} <span className="text-xs text-gray-500">({dict.optional})</span>
                            </label>
                            <input
                                type="text"
                                value={uploadForm.documentSubject}
                                onChange={(e) => setUploadForm({ ...uploadForm, documentSubject: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                placeholder={dict.documentSubject}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {dict.description} <span className="text-xs text-gray-500">({dict.optional})</span>
                            </label>
                            <textarea
                                value={uploadForm.description}
                                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                                rows={3}
                                placeholder={dict.descriptionPlaceholder || "Evrak hakkında not ekleyin"}
                            />
                        </div>

                        {/* Sender & Recipient */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {dict.sender} <span className="text-xs text-gray-500">({dict.optional})</span>
                                </label>
                                <input
                                    type="text"
                                    value={uploadForm.sender}
                                    onChange={(e) => setUploadForm({ ...uploadForm, sender: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                    placeholder={dict.sender}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {dict.recipient} <span className="text-xs text-gray-500">({dict.optional})</span>
                                </label>
                                <input
                                    type="text"
                                    value={uploadForm.recipient}
                                    onChange={(e) => setUploadForm({ ...uploadForm, recipient: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                    placeholder={dict.recipient}
                                />
                            </div>
                        </div>

                        {/* Reference Number & Document Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {dict.referenceNumber} <span className="text-xs text-gray-500">({dict.optional})</span>
                                </label>
                                <input
                                    type="text"
                                    value={uploadForm.referenceNumber}
                                    onChange={(e) => setUploadForm({ ...uploadForm, referenceNumber: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                    placeholder={dict.referenceNumber}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {dict.documentDate} <span className="text-xs text-gray-500">({dict.optional})</span>
                                </label>
                                <input
                                    type="date"
                                    value={uploadForm.documentDate}
                                    onChange={(e) => setUploadForm({ ...uploadForm, documentDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {dict.tags} <span className="text-xs text-gray-500">({dict.optional})</span>
                            </label>
                            <input
                                type="text"
                                value={uploadForm.tags}
                                onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                placeholder={dict.tagsPlaceholder || "Etiketleri virgülle ayırarak giriniz"}
                            />
                            <p className="text-xs text-gray-500 mt-1">{dict.tagsHelp || "Örn: muhasebe, müşteri, önemli"}</p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setUploadModalOpen(false)}
                                disabled={isUploading}
                                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                {dict.cancel}
                            </button>
                            <button
                                type="submit"
                                disabled={isUploading || !uploadForm.file || !uploadForm.documentType}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                {isUploading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Yükleniyor...
                                    </span>
                                ) : dict.uploadDocument}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </div>
    );
}
