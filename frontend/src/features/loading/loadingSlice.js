import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isLoading: false,
    loadingMessage: '',
    skeletonScreens: {
        dashboard: false,
        market: false,
        portfolio: false,
        trading: false,
        watchlist: false,
        wallet: false,
        transactions: false
    }
};

const loadingSlice = createSlice({
    name: 'loading',
    initialState,
    reducers: {
        setLoading: (state, action) => {
            // Always set isLoading to false to disable loading states
            state.isLoading = false;
            state.loadingMessage = '';
        },
        setSkeletonScreen: (state, action) => {
            const { screen } = action.payload;
            if (state.skeletonScreens.hasOwnProperty(screen)) {
                // Always set to false to disable skeleton screens
                state.skeletonScreens[screen] = false;
            }
        },
        resetLoading: (state) => {
            state.isLoading = false;
            state.loadingMessage = '';
            Object.keys(state.skeletonScreens).forEach(screen => {
                state.skeletonScreens[screen] = false;
            });
        }
    }
});

export const { setLoading, setSkeletonScreen, resetLoading } = loadingSlice.actions;
export default loadingSlice.reducer;