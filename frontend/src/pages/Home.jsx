import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import Layout from "../components/Layout";
import HeroCarousel from "../components/HeroCarousel";
import ProductCard from "../components/ProductCard";

function Row({ title, products, link }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-gray-900" data-testid={`section-title-${title.replace(/\s/g, '-').toLowerCase()}`}>{title}</h2>
          {link && <Link to={link} className="text-sm text-[#0066c0] hover:text-[#FF9900] hover:underline">See all →</Link>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {products.slice(0, 5).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [data, setData] = useState({ trending: [], bestseller: [], electronics: [], fashion: [], home: [], beauty: [] });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/products?featured=trending&limit=10"),
      api.get("/products?featured=bestseller&limit=10"),
      api.get("/products?category=electronics&limit=10"),
      api.get("/products?category=fashion&limit=10"),
      api.get("/products?category=home&limit=10"),
      api.get("/products?category=beauty&limit=10"),
      api.get("/categories"),
    ]).then(([t, b, e, f, h, be, c]) => {
      setData({
        trending: t.data.items, bestseller: b.data.items,
        electronics: e.data.items, fashion: f.data.items, home: h.data.items, beauty: be.data.items,
      });
      setCategories(c.data);
    }).catch(() => {});
  }, []);

  return (
    <Layout>
      <HeroCarousel />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((c) => (
            <Link key={c.slug} to={`/products?category=${c.slug}`} className="bg-white rounded-xl border border-gray-200 p-4 product-card-hover flex flex-col items-center text-center" data-testid={`category-tile-${c.slug}`}>
              <div className="w-20 h-20 rounded-full overflow-hidden mb-3 bg-gray-100">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-sm font-semibold text-gray-800">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <Row title="Trending Now" products={data.trending} link="/products" />
      <Row title="Best Sellers" products={data.bestseller} link="/products?sort=popularity" />
      <Row title="Electronics" products={data.electronics} link="/products?category=electronics" />
      <Row title="Fashion" products={data.fashion} link="/products?category=fashion" />
      <Row title="Home Appliances" products={data.home} link="/products?category=home" />
      <Row title="Beauty" products={data.beauty} link="/products?category=beauty" />

      <div className="h-12" />
    </Layout>
  );
}
