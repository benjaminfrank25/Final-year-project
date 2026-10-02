import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ApiError, api, errorMessage } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  initializing: boolean; // true until the first /me check finishes
}

interface LoginInput {
  email: string;
  password: string;
}

const initialState: AuthState = {
  user: null,
  initializing: true,
};

// Runs once on app load: "do I already have a valid cookie?"
export const fetchMe = createAsyncThunk<User | null>(
  "auth/fetchMe",
  async () => {
    try {
      const data = await api<{ user: User }>("/auth/me");
      return data.user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
);

export const login = createAsyncThunk<
  User,
  LoginInput,
  { rejectValue: string }
>("auth/login", async (input, { rejectWithValue }) => {
  try {
    const data = await api<{ user: User }>("/auth/login", {
      method: "POST",
      body: input,
    });
    return data.user;
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

export const logout = createAsyncThunk<void>("auth/logout", async () => {
  try {
    await api<unknown>("/auth/logout", { method: "POST" });
  } catch {
    // even if the request fails, we still clear the user locally
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.initializing = false;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.initializing = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export default authSlice.reducer;
