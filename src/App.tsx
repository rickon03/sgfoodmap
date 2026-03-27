import { ArrowUp, Star } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CommunityFooter } from "./components/CommunityFooter";
import { CoreActionCards } from "./components/CoreActionCards";
import { DetailModal } from "./components/DetailModal";
import { FilterBar } from "./components/FilterBar";
import { GroupDiningFeature } from "./components/GroupDiningFeature";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ListMapToggle, type ViewMode } from "./components/ListMapToggle";
import { LoginModal } from "./components/LoginModal";
import { PasswordResetModal } from "./components/PasswordResetModal";
import { MockMapView } from "./components/MockMapView";
import { ProfileDrawer } from "./components/ProfileDrawer";
import { PromoBanner } from "./components/PromoBanner";
import { RestaurantCard } from "./components/RestaurantCard";
import { SearchBar } from "./components/SearchBar";
import { type PriceOrder, type SortMode } from "./components/SortBar";
import {
  type Coupon,
  type PriceFilterSelection,
  type Restaurant,
  type RestaurantRow,
  matchesGeoFilter,
  matchesPriceFilter,
  restaurantMatchesSearch,
  rowToRestaurantUI,
} from "./data/restaurants";
import type { University } from "./data/universities";
import { supabase } from "./lib/supabaseClient";
type ClaimedCoupon = Coupon & { restaurantName: string };
const CLAIMED_COUPONS_KEY = "ny-food-map-claimed-coupons";

function useFilteredList(
  restaurants: Restaurant[],
  university: University,
  subLocation: string,
  category: string,
  categoryMultiSelect: boolean,
  selectedCategories: string[],
  priceFilter: PriceFilterSelection,
  searchQuery: string
) {
  return useMemo(() => {
    return restaurants.filter((r) => {
      const geoOk = matchesGeoFilter(r, university, subLocation);
      const catOk = categoryMultiSelect
        ? selectedCategories.length === 0 || selectedCategories.includes(r.category)
        : category === "全部" || r.category === category;
      const priceOk = matchesPriceFilter(r.price, priceFilter);
      const searchOk = restaurantMatchesSearch(r, searchQuery);
      return geoOk && catOk && priceOk && searchOk;
    });
  }, [
    restaurants,
    university,
    subLocation,
    category,
    categoryMultiSelect,
    selectedCategories,
    priceFilter,
    searchQuery,
  ]);
}

export default function App() {
  const [university, setUniversity] = useState<University>("全部");
  const [subLocation, setSubLocation] = useState("全部");
  const [category, setCategory] = useState("全部");
  const [categoryMultiSelect, setCategoryMultiSelect] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceFilter, setPriceFilter] = useState<PriceFilterSelection>({
    kind: "preset",
    tier: "全部",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [priceOrder, setPriceOrder] = useState<PriceOrder>("asc");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("同学");
  const [userEmail, setUserEmail] = useState("");
  const [appToast, setAppToast] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginIntro, setLoginIntro] = useState<string | null>(null);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isSearchSticky, setIsSearchSticky] = useState(false);
  const [stickyHeaderHeightPx, setStickyHeaderHeightPx] = useState(88);
  const searchStickyWrapRef = useRef<HTMLDivElement>(null);

  const syncSearchStuckFromDom = useCallback(() => {
    const el = searchStickyWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // 放宽阈值：移动端子像素 / 地址栏伸缩时避免黄条抖动
    const stuck = Math.abs(rect.top - stickyHeaderHeightPx) <= 6;
    setIsSearchSticky((prev) => (prev === stuck ? prev : stuck));
  }, [stickyHeaderHeightPx]);

  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [claimedCoupons, setClaimedCoupons] = useState<ClaimedCoupon[]>([]);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [restaurantsError, setRestaurantsError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(CLAIMED_COUPONS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ClaimedCoupon[];
      if (Array.isArray(parsed)) setClaimedCoupons(parsed);
    } catch {
      // ignore corrupted local storage
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CLAIMED_COUPONS_KEY, JSON.stringify(claimedCoupons));
  }, [claimedCoupons]);

  useLayoutEffect(() => {
    const el = document.getElementById("header-sticky-bar");
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      setStickyHeaderHeightPx(Math.round(h));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** 顶栏高度变化后立刻校正（横竖屏 / 窗口缩放） */
  useLayoutEffect(() => {
    syncSearchStuckFromDom();
  }, [syncSearchStuckFromDom]);

  /** 仅在搜索条已吸附到顶栏下方（几何对齐）时变黄；兼容移动端地址栏与桌面缩放 */
  useEffect(() => {
    let raf = 0;
    const run = () => {
      raf = 0;
      syncSearchStuckFromDom();
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(run);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    syncSearchStuckFromDom();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [syncSearchStuckFromDom]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setRestaurantsLoading(true);
        setRestaurantsError(null);
        const { data, error } = await supabase
          .from("restaurants")
          .select("*")
          .returns<RestaurantRow[]>();
        if (error) throw error;
        const next = (data ?? []).map(rowToRestaurantUI);
        if (!alive) return;
        setRestaurants(next);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "获取餐厅列表失败";
        if (!alive) return;
        setRestaurantsError(msg);
      } finally {
        if (!alive) return;
        setRestaurantsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const hashEarly = typeof window !== "undefined" ? window.location.hash : "";
    const recoveryFromHash =
      /type=recovery/i.test(hashEarly) || /type%3Drecovery/i.test(hashEarly);

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const user = data.session?.user;
      if (recoveryFromHash) {
        setPasswordRecoveryOpen(true);
        if (user) {
          setIsLoggedIn(true);
          setUserId(user.id);
          setUsername((user.user_metadata?.username as string | undefined) || "同学");
          setUserEmail(user.email ?? "");
        }
        return;
      }
      if (user) {
        setIsLoggedIn(true);
        setUserId(user.id);
        setUsername((user.user_metadata?.username as string | undefined) || "同学");
        setUserEmail(user.email ?? "");
        setAppToast(
          `欢迎回来，${(user.user_metadata?.username as string | undefined) || "同学"}！`
        );
        window.setTimeout(() => setAppToast(null), 2600);
      } else {
        setIsLoggedIn(false);
        setUserId(null);
        setUserEmail("");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryOpen(true);
      }
      const user = session?.user;
      if (user) {
        setIsLoggedIn(true);
        setUserId(user.id);
        setUsername((user.user_metadata?.username as string | undefined) || "同学");
        setUserEmail(user.email ?? "");
      } else {
        setIsLoggedIn(false);
        setUserId(null);
        setUsername("同学");
        setUserEmail("");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const filtered = useFilteredList(
    restaurants,
    university,
    subLocation,
    category,
    categoryMultiSelect,
    selectedCategories,
    priceFilter,
    searchQuery
  );
  const sorted = useMemo(() => {
    const next = [...filtered];
    if (sortMode === "distance") {
      next.sort((a, b) => extractMeters(a.distance) - extractMeters(b.distance));
    } else if (sortMode === "rating") {
      next.sort((a, b) => b.rating - a.rating);
    } else if (sortMode === "price") {
      next.sort((a, b) =>
        priceOrder === "asc" ? a.price - b.price : b.price - a.price
      );
    }
    return next;
  }, [filtered, sortMode, priceOrder]);

  const [randomLoading, setRandomLoading] = useState(false);
  const [picked, setPicked] = useState<Restaurant | null>(null);
  const [randomHint, setRandomHint] = useState<string | null>(null);
  const [groupOpenSignal, setGroupOpenSignal] = useState(0);

  const [modalRestaurant, setModalRestaurant] = useState<Restaurant | null>(
    null
  );

  const openRestaurant = useCallback((r: Restaurant) => {
    setModalRestaurant(r);
    setViewedIds((prev) => {
      const next = [r.id, ...prev.filter((id) => id !== r.id)];
      return next.slice(0, 30);
    });
  }, []);

  useEffect(() => {
    setPicked(null);
    setRandomHint(null);
  }, [
    university,
    subLocation,
    category,
    categoryMultiSelect,
    selectedCategories,
    priceFilter,
    searchQuery,
  ]);

  const handleRandom = useCallback(() => {
    setRandomHint(null);
    setRandomLoading(true);
    window.setTimeout(() => {
      const pool = sorted.length > 0 ? sorted : restaurants;
      if (sorted.length === 0) {
        setRandomHint(
          "当前筛选与搜索没有匹配的店，已从全部店铺中随机。"
        );
      }
      const i = Math.floor(Math.random() * pool.length);
      const choice = pool[i] ?? null;
      setPicked(choice);
      if (choice) {
        setViewedIds((prev) => {
          const next = [choice.id, ...prev.filter((id) => id !== choice.id)];
          return next.slice(0, 30);
        });
      }
      setRandomLoading(false);
    }, 1000);
  }, [sorted, restaurants]);

  const searchActive = searchQuery.trim().length > 0;
  const claimedCouponKeySet = useMemo(
    () => new Set(claimedCoupons.map((c) => `${c.restaurantName}::${c.title}`)),
    [claimedCoupons]
  );

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24">
      <Header
        isLoggedIn={isLoggedIn}
        username={username}
        onLoginClick={() => {
          setLoginIntro(null);
          setLoginOpen(true);
        }}
        onProfileClick={() => setProfileOpen(true)}
      />

      <main className="w-full bg-[#F4F4F5]">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8">
          <PromoBanner />
          <div className="space-y-3">
            <CoreActionCards
              randomLoading={randomLoading}
              onRandomPick={handleRandom}
              onOpenGroupDining={() => setGroupOpenSignal((v) => v + 1)}
            />
            <Hero
              picked={picked}
              randomHint={randomHint}
              onOpenDetail={openRestaurant}
              onDismissPicked={() => {
                setPicked(null);
                setRandomHint(null);
              }}
            />

            <GroupDiningFeature
              restaurants={restaurants}
              isLoggedIn={isLoggedIn}
              userId={userId}
              currentUsername={username}
              hideTriggers
              openSignal={groupOpenSignal}
              onRequestLogin={(intro) => {
                setLoginIntro(intro);
                setLoginOpen(true);
              }}
            />
          </div>
        </div>

        {/* 吸顶：外层浅灰；仅「搜索区」黄底 + 非对称过渡；「筛选区」永为浅灰；上下无 gap */}
        <div
          ref={searchStickyWrapRef}
          className="sticky z-40 mt-[calc(0.75rem-1px)] w-full bg-[#F4F4F5]"
          style={{ top: stickyHeaderHeightPx }}
        >
          <div
            className={
              isSearchSticky
                ? "bg-[#FFC300] pb-[1px] transition-colors duration-200 ease-in motion-reduce:transition-none"
                : "bg-[#F4F4F5] transition-none duration-0"
            }
          >
            <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
          </div>
          <div
            className={`bg-[#F4F4F5] ${isSearchSticky ? "pt-0" : "pt-3"}`}
          >
            <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8">
              <FilterBar
                university={university}
                subLocation={subLocation}
                category={category}
                categoryMultiSelect={categoryMultiSelect}
                selectedCategories={selectedCategories}
                onCategoryMultiSelectChange={(on) => {
                  setCategoryMultiSelect(on);
                  if (on) {
                    setSelectedCategories(category === "全部" ? [] : [category]);
                  } else {
                    if (selectedCategories.length === 1) {
                      setCategory(selectedCategories[0]!);
                    } else if (selectedCategories.length === 0) {
                      setCategory("全部");
                    } else {
                      setCategory("全部");
                    }
                  }
                }}
                onToggleCategoryMulti={(c) => {
                  if (c === "全部") {
                    setSelectedCategories([]);
                    return;
                  }
                  setSelectedCategories((prev) =>
                    prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                  );
                }}
                priceFilter={priceFilter}
                onUniversity={(u) => {
                  setUniversity(u);
                  setSubLocation("全部");
                }}
                onSubLocation={setSubLocation}
                onCategory={setCategory}
                onPriceFilterChange={setPriceFilter}
                sortMode={sortMode}
                priceOrder={priceOrder}
                onSortMode={setSortMode}
                onTogglePriceOrder={() =>
                  setPriceOrder((v) => (v === "asc" ? "desc" : "asc"))
                }
                onClearCategoryFilter={() => {
                  setCategory("全部");
                  setSelectedCategories([]);
                  setCategoryMultiSelect(false);
                }}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mt-3 flex min-w-0 flex-col gap-3">
            <ListMapToggle mode={viewMode} onChange={setViewMode} />

          <div className="min-w-0 pt-0 md:pt-0.5">
          {viewMode === "list" && (
            <section className="pt-1.5 md:pt-4">
              <h2 className="text-lg font-semibold leading-tight text-gray-900 sm:text-xl md:leading-snug">
                附近高分好店
              </h2>
              <p className="mt-0.5 text-sm leading-snug text-gray-500 md:mt-1.5 md:text-[15px] md:leading-relaxed">
                共 {sorted.length} 家
                {searchActive ? " 符合筛选与搜索" : " 符合当前筛选"}
              </p>

              {restaurantsLoading ? (
                <p className="mt-3 rounded-2xl bg-white p-6 text-center text-sm text-gray-500 ring-1 ring-gray-100 md:mt-6 md:p-8">
                  正在加载餐厅列表...
                </p>
              ) : restaurantsError ? (
                <p className="mt-3 rounded-2xl bg-white p-6 text-center text-sm text-red-600 ring-1 ring-gray-100 md:mt-6 md:p-8">
                  加载失败：{restaurantsError}
                </p>
              ) : sorted.length === 0 ? (
                <p className="mt-3 rounded-2xl bg-white p-6 text-center text-sm text-gray-500 ring-1 ring-gray-100 md:mt-6 md:p-8">
                  没有符合当前条件与搜索的店铺，试试换个关键词或放宽筛选～
                </p>
              ) : (
                <div className="mt-2.5 grid grid-cols-1 gap-3 md:mt-5 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
                  {sorted.map((r) => (
                    <RestaurantCard
                      key={r.id}
                      restaurant={r}
                      onOpen={openRestaurant}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {viewMode === "map" && (
            <div className="pb-2 pt-1.5 md:pb-3 md:pt-3 lg:flex lg:items-stretch lg:gap-5">
              <aside className="mb-3 hidden max-h-[min(72vh,640px)] w-full shrink-0 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-sm ring-1 ring-black/5 lg:mb-0 lg:block lg:w-80 lg:max-w-[20rem]">
                <p className="mb-2 text-xs font-bold text-gray-700">
                  当前结果{" "}
                  <span className="text-red-600">{sorted.length}</span> 家
                </p>
                <ul className="space-y-2">
                  {sorted.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => openRestaurant(r)}
                        className="w-full rounded-xl border border-gray-100 px-3 py-2.5 text-left text-sm transition hover:border-meituan-border hover:bg-meituan-soft"
                      >
                        <span className="font-bold text-gray-900">{r.name}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-orange-600">
                          <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-500" />
                          {r.rating.toFixed(1)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                          {r.location}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
              <div className="min-w-0 flex-1">
                <MockMapView
                  embedded
                  restaurants={sorted}
                  onOpenRestaurant={openRestaurant}
                />
              </div>
            </div>
          )}
          </div>
        </div>

          <CommunityFooter />
        </div>
      </main>

      <DetailModal
        restaurant={modalRestaurant}
        onClose={() => setModalRestaurant(null)}
        isLoggedIn={isLoggedIn}
        userId={userId}
        currentUsername={username}
        claimedCouponKeys={claimedCouponKeySet}
        onClaimCoupon={(restaurantName, coupon) => {
          const key = `${restaurantName}::${coupon.title}`;
          if (claimedCouponKeySet.has(key)) return false;
          setClaimedCoupons((prev) => [...prev, { restaurantName, ...coupon }]);
          return true;
        }}
        onRequestLogin={(intro) => {
          setLoginIntro(intro);
          setLoginOpen(true);
        }}
      />

      <LoginModal
        open={loginOpen}
        introBanner={loginIntro}
        onClose={() => {
          setLoginOpen(false);
          setLoginIntro(null);
        }}
        onLoggedIn={(name, email, uid) => {
          setIsLoggedIn(true);
          setUserId(uid);
          setUsername(name);
          setUserEmail(email);
          setAppToast(`欢迎回来，${name}！`);
          window.setTimeout(() => setAppToast(null), 2600);
        }}
      />

      <PasswordResetModal
        open={passwordRecoveryOpen}
        onClose={() => setPasswordRecoveryOpen(false)}
        onPasswordUpdated={(name, email, uid) => {
          setIsLoggedIn(true);
          setUserId(uid);
          setUsername(name);
          setUserEmail(email);
          setAppToast(`密码已更新，欢迎回来，${name}！`);
          window.setTimeout(() => setAppToast(null), 2800);
        }}
      />

      <ProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onLogout={async () => {
          await supabase.auth.signOut();
          setIsLoggedIn(false);
          setUserId(null);
          setUsername("同学");
          setUserEmail("");
        }}
        userId={userId}
        username={username}
        email={userEmail}
        claimedCoupons={claimedCoupons}
        restaurants={restaurants}
        viewedIds={viewedIds}
        onPickRestaurant={openRestaurant}
      />

      {appToast && (
        <div
          className="fixed bottom-24 left-4 right-4 z-[100] rounded-2xl border border-meituan-border bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white shadow-2xl md:left-auto md:right-8 md:w-full md:max-w-md"
          role="status"
        >
          {appToast}
        </div>
      )}

      {showBackToTop && !modalRestaurant && (
        <button
          type="button"
          aria-label="返回顶部"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-36 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-[#FFC300] text-gray-900 shadow-lg transition-opacity duration-300 hover:brightness-95"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

function extractMeters(distance: string): number {
  const m = String(distance).match(/\d+/);
  return m ? Number.parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}
