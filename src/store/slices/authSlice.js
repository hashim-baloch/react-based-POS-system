import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { databases } from "../../config/appwrite";
import { Query } from "appwrite";
import { setProducts } from "./inventorySlice";
import { setPurchases } from "./purchaseSlice";
import { loadSales } from "./salesSlice";
import { setExpenses } from "./expenseSlice";
import { updateProfilePictureUrl } from "./userSlice";

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_IDS = {
  inventory: import.meta.env.VITE_INVENTORY_COLLECTION,
  sales: import.meta.env.VITE_SALES_COLLECTION,
  purchases: import.meta.env.VITE_PURCHASES_COLLECTION,
  expenses: import.meta.env.VITE_EXPENSES_COLLECTION,
  user: import.meta.env.VITE_USERS_COLLECTION,
};

const fetchCollectionData = async (collectionId, userId) => {
  try {
    const response = await databases.listDocuments(DATABASE_ID, collectionId, [
      Query.equal("userId", userId),
    ]);
    console.log(response);
    if (response.documents.length > 0) {
      console.log(JSON.parse(response.documents[0].data));
      return JSON.parse(response.documents[0].data);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${collectionId}:`, error);
    return null;
  }
};

export const syncUserData = createAsyncThunk(
  "auth/syncUserData",
  async (userId, { dispatch }) => {
    if (!userId) return false;

    try {
      // Fetch all data in parallel
      const results = await Promise.allSettled([
        fetchCollectionData(COLLECTION_IDS.inventory, userId),
        fetchCollectionData(COLLECTION_IDS.sales, userId),
        fetchCollectionData(COLLECTION_IDS.purchases, userId),
        fetchCollectionData(COLLECTION_IDS.expenses, userId),
        fetchCollectionData(COLLECTION_IDS.user, userId),
      ]);

      // Process results and dispatch actions only for successful fetches
      // results.forEach((result, index) => {
      //   if (result.status === "fulfilled" && result.value) {
      //     switch (index) {
      //       case 0: // inventory
      //         if (result.value.products) {
      //           dispatch(setProducts(result.value.products));
      //         }
      //         break;
      //       case 1: // sales
      //         if (result.value.sales) {
      //           dispatch(loadSales(result.value.sales));
      //         }
      //         break;
      //       case 2: // purchases
      //         if (result.value.purchases) {
      //           dispatch(setPurchases(result.value.purchases));
      //         }
      //         break;
      //       case 3: // expenses
      //         if (result.value) {
      //           dispatch(setExpenses(result.value));
      //         }
      //         break;
      //       case 4: // user data
      //         if (result.value?.profilePictureUrl) {
      //           dispatch(
      //             updateProfilePictureUrl(result.value.profilePictureUrl)
      //           );
      //         }
      //         break;
      //     }
      //   }
      // });
      // After fetching each collection
      // results.forEach((result) => {
      //   if (result.status === "fulfilled" && result.value) {
      //     dispatch(setProducts(result.value.inventory));
      //     dispatch(loadSales(result.value.sales));
      //     dispatch(setPurchases(result.value.purchases));
      //     dispatch(setExpenses(result.value.expenses));
      //     dispatch(updateProfilePictureUrl(result.value.user));
      //   }
      // });
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          switch (index) {
            case 0: // inventory
              dispatch(setProducts(result.value));
              break;
            case 1: // sales
              dispatch(loadSales(result.value));
              break;
            case 2: // purchases
              dispatch(setPurchases(result.value));
              break;
            case 3: // expenses
              dispatch(setExpenses(result.value));
              break;
            case 4: // user data
              dispatch(updateProfilePictureUrl(result.value));
              break;
          }
        }
      });
      return true;
    } catch (error) {
      console.error("Error syncing user data:", error);
      return false;
    }
  }
);

const initialState = {
  user: null,
  loading: false,
  error: null,
  syncing: false,
  dataLoaded: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      const userData = action.payload;
      state.user = {
        id: userData.id || userData.$id,
        email: userData.email,
        name: userData.name,
        createdAt: userData.$createdAt || userData.createdAt,
      };
      state.loading = false;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
      state.dataLoaded = false;
      sessionStorage.clear();
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncUserData.pending, (state) => {
        state.syncing = true;
      })
      .addCase(syncUserData.fulfilled, (state) => {
        state.syncing = false;
        state.dataLoaded = true;
      })
      .addCase(syncUserData.rejected, (state) => {
        state.syncing = false;
        state.error = "Failed to sync user data";
      });
  },
});

export const { setUser, clearUser, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
