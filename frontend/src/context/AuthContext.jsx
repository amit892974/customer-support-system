
import {
    createContext,
    useContext,
    useState
} from "react";

import API from "../api/axios";

const AuthContext = createContext(null);

// Custom hook to access authentication
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    return useContext(AuthContext);
};

// Authentication provider
export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [loading, setLoading] = useState(false);

    const saveAuthData = (data) => {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
    };

    // REGISTER
    const register = async (name, email, password) => {
        try {
            setLoading(true);

            const response = await API.post("/auth/register", {
                name,
                email,
                password
            });

            saveAuthData(response.data);

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    "Registration failed. Please try again."
            };

        } finally {
            setLoading(false);
        }
    };

    // LOGIN
    const login = async (email, password) => {
        try {
            setLoading(true);

            const response = await API.post("/auth/login", {
                email,
                password
            });

            saveAuthData(response.data);

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    "Login failed. Please try again."
            };

        } finally {
            setLoading(false);
        }
    };

    // LOGOUT
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    };

    const value = {
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
