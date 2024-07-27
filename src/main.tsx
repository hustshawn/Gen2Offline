import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import Layout from "./Layout.tsx";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: window.localStorage,
});
// we need a default mutation function so that paused mutations can resume after a page reload
// queryClient.setMutationDefaults(['titles'], {
//   mutationFn: async ({ title }) => {
//     // to avoid clashes with our optimistic update when an offline mutation continues

//     await queryClient.cancelQueries({ queryKey: ["titles"] });
//     return api.updateMovie(id, comment)
//   },
// })

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* <QueryClientProvider client={queryClient}> */}
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
      onSuccess={() => {
        // resume mutations after initial restore from localStorage was successful
        queryClient.resumePausedMutations().then(() => {
          queryClient.invalidateQueries();
        });
      }}
    >
      <Layout>
        <App />
      </Layout>
      <ReactQueryDevtools initialIsOpen />
    </PersistQueryClientProvider>
  </React.StrictMode>
);
