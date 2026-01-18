import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../../services/api'; // Import API
import PasswordInput from '../../components/PasswordInput';
import './Login.css';

const Login = () => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await loginUser({
                usernameOrEmail: credentials.email,
                password: credentials.password
            });
            console.log('Login success:', data);

            // Store token
            let token = data.accessToken || data.token;
            if (token) {
                localStorage.setItem('token', token);
            }

            // Store role and redirect based on role
            const role = data.role || 'ROLE_USER';
            localStorage.setItem('role', role);

            if (role === 'ROLE_ADMIN') {
                navigate('/admin');
            } else if (role === 'ROLE_STAFF') {
                navigate('/staff');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        }
    };

    return (
        <div className="login-container">
            <div className="card login-card">
                <h2 className="text-center">Welcome Back</h2>
                <p className="text-dim text-center">Sign in to resolve your grievances</p>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="input-field"
                            placeholder="Enter your email address"
                            value={credentials.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <PasswordInput
                            name="password"
                            placeholder="Enter your password"
                            value={credentials.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary w-100">Sign In</button>
                </form>

                <div className="footer-link">
                    Don't have an account? <Link to="/register">Create one</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
