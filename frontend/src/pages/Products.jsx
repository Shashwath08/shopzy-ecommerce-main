import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const q = params.get("q") || "";
  const category = params.get("category") || "";
  const sort = params.get("sort") || "";
  const page = parseInt(params.get("page") || "1");

  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (category) qs.set("category", category);
    if (sort) qs.set("sort", sort);
    qs.set("page", page);
    qs.set("limit", 20);
    api.get(`/products?${qs.toString()}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [q, category, sort, page]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-32">
              <h3 className="font-heading font-semibold text-lg mb-3">Category</h3>
              <div className="space-y-2">
                <button onClick={() => setParam("category", "")} className={`block w-full text-left text-sm py-1 ${!category ? "text-[#FF9900] font-semibold" : "text-gray-700 hover:text-[#FF9900]"}`} data-testid="filter-cat-all">All categories</button>
                {categories.map((c) => (
                  <button key={c.slug} onClick={() => setParam("category", c.slug)} className={`block w-full text-left text-sm py-1 ${category === c.slug ? "text-[#FF9900] font-semibold" : "text-gray-700 hover:text-[#FF9900]"}`} data-testid={`filter-cat-${c.slug}`}>{c.name}</button>
                ))}
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600" data-testid="results-count">
                {loading ? "Loading..." : `${data.total} results${q ? ` for "${q}"` : ""}${category ? ` in ${category}` : ""}`}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 hidden sm:inline">Sort by:</span>
                <Select value={sort || "default"} onValueChange={(v) => setParam("sort", v === "default" ? "" : v)}>
                  <SelectTrigger className="w-[180px]" data-testid="sort-select"><SelectValue placeholder="Featured" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Featured</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Avg. Customer Review</SelectItem>
                    <SelectItem value="popularity">Popularity</SelectItem>
                    <SelectItem value="newest">Newest Arrivals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {data.items.length === 0 && !loading && (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500" data-testid="no-results">No products found.</div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>

            {data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8" data-testid="pagination">
                <Button variant="outline" disabled={page <= 1} onClick={() => setParam("page", page - 1)} data-testid="page-prev">Previous</Button>
                <span className="text-sm">Page {page} of {data.pages}</span>
                <Button variant="outline" disabled={page >= data.pages} onClick={() => setParam("page", page + 1)} data-testid="page-next">Next</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
