import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const baseURL = "http://127.0.0.1:8000/api";

// Function to check if the token is expired
const isTokenExpired = (token) => {
  const decoded = jwtDecode(token);
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};

// Initial state
const initialState = {
  user: localStorage.getItem('authTokens') && !isTokenExpired(JSON.parse(localStorage.getItem('authTokens')).access)
    ? jwtDecode(JSON.parse(localStorage.getItem('authTokens')).access)
    : null,
  authTokens: localStorage.getItem('authTokens') && !isTokenExpired(JSON.parse(localStorage.getItem('authTokens')).access)
    ? JSON.parse(localStorage.getItem('authTokens'))
    : null,
  loading: false,
  error: null,
};

// Thunk for logging in the user
export const loginUser = createAsyncThunk('auth/loginUser', async ({ email, password }, thunkAPI) => {
  try {
    const response = await axios.post(`${baseURL}/token/`, { email, password });
    const data = response.data;
    localStorage.setItem('authTokens', JSON.stringify(data));  // Save tokens to local storage
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || 'Something went wrong');
  }
});

// Thunk for registering a new user
export const registerUser = createAsyncThunk('auth/registerUser', async ({ email, username, password, password2 }, thunkAPI) => {
  try {
    const response = await axios.post(`${baseURL}/register/`, { email, username, password, password2 });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || 'Something went wrong');
  }
});

// Thunk for refreshing the token
export const refreshToken = createAsyncThunk('auth/refreshToken', async (_, thunkAPI) => {
  const state = thunkAPI.getState();
  const refresh = state.auth.authTokens?.refresh;  // Get refresh token from state

  if (!refresh) {
    return thunkAPI.rejectWithValue('No refresh token found');
  }

  try {
    const response = await axios.post(`${baseURL}/token/refresh/`, { refresh });
    const data = response.data;
    localStorage.setItem('authTokens', JSON.stringify(data));  // Update tokens in local storage
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || 'Failed to refresh token');
  }
});

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.authTokens = null;
      localStorage.removeItem('authTokens');  // Clear tokens from local storage on logout
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.authTokens = action.payload;
        state.user = jwtDecode(action.payload.access);  // Decode access token to get user info
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.authTokens = action.payload;
        state.user = jwtDecode(action.payload.access);  // Decode refreshed token
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.error = action.payload;
        state.authTokens = null;
        state.user = null;  // Reset user if token refresh fails
        localStorage.removeItem('authTokens');  // Clear tokens from localStorage
      });
  },
});

// Exporting logout action
export const { logout } = authSlice.actions;

export default authSlice.reducer;
