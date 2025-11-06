import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useLocation } from 'react-router-dom';
import Header from '../components/header';
import Footer from '../components/footer';
import Sidebar from '../components/Home/Sidebar';
import BookSlider from '../components/Home/BookSlider';
import CategorySection from '../components/Home/CategorySection';
import FilterSection from '../components/Home/FilterSection';
import BookList from '../components/Home/BookList';
import useWindowWidth from '../hooks/useWindowWidth';
import BreadCrumb from '../components/Home/BreadCrumb';
import BestSeller from '../components/Home/BestSellers';
const Home = () => {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const width = useWindowWidth();

    const [searchParams] = useSearchParams();
    const location = useLocation();
    useEffect(() => {
        // Scroll to the book-list anchor only if initiated by search (one-time and fresh)
        if (typeof window === 'undefined') return;
        let shouldScroll = false;
        let tsOk = false;
        try {
            shouldScroll = sessionStorage.getItem('scroll_to_book_list_once') === '1';
            const ts = Number(sessionStorage.getItem('scroll_to_book_list_ts') || 0);
            tsOk = Number.isFinite(ts) && Date.now() - ts < 3000; // must be within 3s of navigation
        } catch { shouldScroll = false; tsOk = false; }
        if (!(shouldScroll && tsOk)) {
            try { sessionStorage.removeItem('scroll_to_book_list_once'); sessionStorage.removeItem('scroll_to_book_list_ts'); } catch { }
            return;
        }
        const el = document.getElementById('book-list');
        if (!el) return;
        requestAnimationFrame(() => {
            const header = document.querySelector('header') as HTMLElement | null;
            const headerOffset = header ? header.offsetHeight : 0;
            const top = window.scrollY + el.getBoundingClientRect().top - headerOffset - 8;
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
            try { sessionStorage.removeItem('scroll_to_book_list_once'); sessionStorage.removeItem('scroll_to_book_list_ts'); } catch { }
        });
    }, [location.pathname, loading]);

    useEffect(() => {
        const fetchBooksWithParams = async () => {
            const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
            setLoading(true);
            setError(null);

            try {
                // Get all search parameters (compatible without Object.fromEntries)
                const params: Record<string, string> = {};
                searchParams.forEach((value, key) => {
                    params[key] = value;
                });

                // Determine rating from either explicit `rating` query or legacy flags
                let rating: number | null = null;
                const ratingParam = searchParams.get('rating');
                if (ratingParam) {
                    const parsed = Number(ratingParam);
                    if (!Number.isNaN(parsed) && parsed > 0) rating = parsed;
                }
                if (rating === null) {
                    if (params['fiveStars'] === 'true') rating = 5;
                    else if (params['fourStars'] === 'true') rating = 4;
                }

                // If using rating path API, strip legacy flags from query
                let url = `${BASE_URL}/books`;
                if (rating !== null) {
                    url = `${BASE_URL}/books/by-rating/${rating}`;
                    delete params['fiveStars'];
                    delete params['fourStars'];
                }

                // If categoryId present, use category API
                const categoryId = searchParams.get('categoryId');
                if (categoryId) {
                    url = `${BASE_URL}/books/by-category/${categoryId}`;
                }

                // If category name present, use name-based category API (takes precedence)
                const categoryName = searchParams.get('category');
                if (categoryName) {
                    url = `${BASE_URL}/books/by-category-name/${encodeURIComponent(categoryName)}`;
                    delete params['category'];
                }

                const response = await axios.get(url, { params });
                const data = response.data as any;
                let items: any[] = [];
                if (Array.isArray(data)) items = data;
                else if (data && Array.isArray(data.data)) items = data.data;
                else if (data && Array.isArray(data.items)) items = data.items;
                // Apply client-side search by `q` if present
                const normalize = (s?: string) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}+/gu, '');
                const qRaw = (searchParams.get('q') || '').trim();
                const q = normalize(qRaw);
                if (q) {
                    const matches = (text?: string) => normalize(text).includes(q);
                    items = items.filter((b: any) => {
                        const name = b?.name as string | undefined;
                        const authors = Array.isArray(b?.authors)
                            ? (b.authors as any[]).map((a) => a?.name).filter(Boolean).join(', ')
                            : (typeof b?.authors === 'string' ? b.authors : '');
                        let categoryText = '';
                        const cat = (b as any)?.categories;
                        if (Array.isArray(cat)) categoryText = cat.map((c: any) => c?.name).filter(Boolean).join(', ');
                        else if (cat && typeof cat === 'object') categoryText = (cat as any)?.name || '';
                        else if (typeof cat === 'string') categoryText = cat;
                        return matches(name) || matches(authors) || matches(categoryText);
                    });
                }
                setBooks(items);
            } catch (err) {
                setError("Không thể tải dữ liệu sản phẩm.");
            } finally {
                setLoading(false);
            }
        };

        fetchBooksWithParams();
    }, [searchParams]);

    const sliderBooks = Array.isArray(books) ? books.slice(0, 4) : [];

    return (
        //Desktop UI
        <>
            {width >= 640 ? (
                <div className='bg-gray-100 min-h-screen'>
                    <Header />
                    <div className="container mx-auto px-4 mt-8">
                        <BreadCrumb />
                        {width >= 640 ? (
                            <div className="flex gap-5 ">
                                <div className="w-1/4">
                                    <Sidebar />
                                </div>
                                <div className="w-3/4">
                                    <BookSlider />
                                    <div className="mt-2 mb-2">
                                        <CategorySection />
                                    </div>
                                    <div className="mb-2">
                                        <FilterSection />
                                    </div>
                                    <div id="book-list" className="h-0" />
                                    <BookList books={books} loading={loading} error={error} />
                                    <div className="mt-8 mb-8">
                                        <BestSeller />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <FilterSection />
                                <div id="book-list" className="h-0" />
                                <BookList books={books} loading={loading} error={error} />
                            </div>
                        )}
                    </div>
                    <Footer />
                </div>
            ) :
                // Mobile UI
                (
                    <div className="bg-gray-100 min-h-screen">
                        <Header />
                        <div className="container mx-auto px-4 mt-2">
                            <FilterSection />
                            <div id="book-list" className="h-0" />
                            <BookList books={books} loading={loading} error={error} />
                        </div>
                        <Footer />
                    </div>
                )}
        </>
    );
};

export default Home;