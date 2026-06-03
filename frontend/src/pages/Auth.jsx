import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      toast.success("Welcome back!");
      navigate(state?.from || "/");
    } else toast.error(res.error);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F7] flex flex-col items-center justify-center p-4">
      <Link to="/" className="font-heading text-3xl font-bold text-[#131921] mb-6" data-testid="auth-logo">Shop<span className="text-[#FF9900]">Zy</span></Link>
      <div className="bg-white border border-gray-300 rounded-xl p-7 w-full max-w-md shadow-sm">
        <h1 className="font-heading text-2xl font-semibold mb-5">Sign in</h1>
        <form onSubmit={submit} className="space-y-4">
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email" /></div>
          <div><Label htmlFor="password">Password</Label><Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password" /></div>
          <Button type="submit" disabled={loading} className="w-full bg-[#FF9900] hover:bg-[#E68A00] text-[#131921] font-semibold" data-testid="login-submit">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="text-xs text-gray-600 mt-5 text-center">
          New to ShopZy?{" "}
          <Link to="/register" className="text-blue-700 hover:text-[#FF9900] hover:underline" data-testid="link-to-register">Create your account</Link>
        </p>
        <div className="mt-5 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-gray-700">
          <p className="font-semibold">Demo accounts:</p>
          <p>Admin: admin@shopzy.com / admin123</p>
          <p>User: demo@shopzy.com / demo123</p>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await register(name, email, password);
    setLoading(false);
    if (res.ok) { toast.success("Account created"); navigate("/"); }
    else toast.error(res.error);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F7] flex flex-col items-center justify-center p-4">
      <Link to="/" className="font-heading text-3xl font-bold text-[#131921] mb-6">Shop<span className="text-[#FF9900]">Zy</span></Link>
      <div className="bg-white border border-gray-300 rounded-xl p-7 w-full max-w-md shadow-sm">
        <h1 className="font-heading text-2xl font-semibold mb-5">Create account</h1>
        <form onSubmit={submit} className="space-y-4">
          <div><Label htmlFor="name">Name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} data-testid="reg-name" /></div>
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="reg-email" /></div>
          <div><Label htmlFor="password">Password (min 6 chars)</Label><Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="reg-password" /></div>
          <Button type="submit" disabled={loading} className="w-full bg-[#FF9900] hover:bg-[#E68A00] text-[#131921] font-semibold" data-testid="reg-submit">
            {loading ? "Creating..." : "Create account"}
          </Button>
        </form>
        <p className="text-xs text-gray-600 mt-5 text-center">
          Already a customer? <Link to="/login" className="text-blue-700 hover:text-[#FF9900] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
