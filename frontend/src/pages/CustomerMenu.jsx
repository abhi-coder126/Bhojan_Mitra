import { useEffect, useMemo, useRef, useState } from "react";
import { BadgePercent, CheckCircle2, ChefHat, Clock, Flame, Leaf, Minus, PackageCheck, Plus, Search, ShoppingBag, Sparkles, Utensils } from "lucide-react";
import { useParams } from "react-router-dom";
import API from "../api/axios";
import PhoneInput from "../components/PhoneInput";
import PublicLottie from "../components/PublicLottie";
import { ToastViewport, useToast } from "../components/Toast";

export default function CustomerMenu() {
  const { tableNo } = useParams();
  const isDelivery = tableNo === "delivery";
  const [products, setProducts] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeFoodType, setActiveFoodType] = useState("all");
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [search, setSearch] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [customer, setCustomer] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    deliveryAddress: "",
    note: "",
  });
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const cartPanelRef = useRef(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    const fetchMenu = async () => {
      setMenuLoading(true);
      try {
        const res = await API.get("/restaurant-orders/menu");
        setProducts(res.data.products || []);
      } catch (error) {
        showToast(error.response?.data?.message || "Menu could not be loaded");
      } finally {
        setMenuLoading(false);
      }
    };

    fetchMenu();
  }, [showToast]);

  useEffect(() => {
    if (!orderPlaced?._id || ["served", "cancelled"].includes(orderPlaced.status)) return undefined;

    const fetchOrderStatus = async () => {
      try {
        const res = await API.get(`/restaurant-orders/${orderPlaced._id}`);
        setOrderPlaced(res.data.order);
      } catch (error) {
        console.log("Order status fetch error:", error);
      }
    };

    const timer = setInterval(fetchOrderStatus, 4000);
    return () => clearInterval(timer);
  }, [orderPlaced?._id, orderPlaced?.status]);

  const categoryStats = useMemo(() => {
    const stats = new Map();
    const filteredByFoodType = products.filter((product) => {
      if (activeFoodType === "veg") return !isNonVeg(product);
      if (activeFoodType === "non-veg") return isNonVeg(product);
      return true;
    });

    filteredByFoodType.forEach((product) => {
      const category = product.category || "Recommended";
      stats.set(category, (stats.get(category) || 0) + 1);
    });

    return [
      { name: "All", count: filteredByFoodType.length },
      ...Array.from(stats.entries()).map(([name, count]) => ({ name, count })),
    ];
  }, [activeFoodType, products]);

  useEffect(() => {
    if (activeCategory === "All") return;
    const exists = categoryStats.some((category) => category.name === activeCategory);
    if (!exists) setActiveCategory("All");
  }, [activeCategory, categoryStats]);

  const visibleProducts = useMemo(() => {
    const q = search.toLowerCase().trim();

    return products.filter((product) => {
      const category = product.category || "Recommended";
      const categoryMatch = activeCategory === "All" || category === activeCategory;
      const foodTypeMatch =
        activeFoodType === "all" ||
        (activeFoodType === "veg" && !isNonVeg(product)) ||
        (activeFoodType === "non-veg" && isNonVeg(product));
      const searchMatch =
        !q ||
        product.name?.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q);

      return categoryMatch && foodTypeMatch && searchMatch;
    });
  }, [activeCategory, activeFoodType, products, search]);

  function isNonVeg(product) {
    const marker = `${product.foodType || ""} ${product.category || ""} ${product.name || ""}`.toLowerCase();
    return marker.includes("non-veg") || marker.includes("non veg") || marker.includes("chicken") || marker.includes("mutton") || marker.includes("fish") || marker.includes("egg");
  }

  const groupedMenu = useMemo(() => {
    const groups = { veg: {}, nonVeg: {} };

    visibleProducts.forEach((product) => {
      const typeKey = isNonVeg(product) ? "nonVeg" : "veg";
      const category = product.category || "Recommended";
      groups[typeKey][category] = [...(groups[typeKey][category] || []), product];
    });

    return groups;
  }, [visibleProducts]);

  const updateCart = (product, change) => {
    if (coupon) {
      setCoupon(null);
      setCouponCode("");
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product._id);

      if (!existing && change > 0) {
        return [
          ...current,
          {
            productId: product._id,
            name: product.name,
            image: product.image,
            category: product.category || "Recommended",
            qty: 1,
            rate: Number(product.mrp || product.sellingPrice || 0),
            gst: Number(product.gst || 0),
          },
        ];
      }

      return current
        .map((item) => {
          if (item.productId !== product._id) return item;
          return { ...item, qty: Math.max(Number(item.qty) + change, 0) };
        })
        .filter((item) => item.qty > 0);
    });
  };

  const cartQty = cart.reduce((sum, item) => sum + Number(item.qty), 0);
  const grandTotal = cart.reduce((sum, item) => sum + Number(item.rate) * Number(item.qty), 0);
  const gstAmount = cart.reduce((sum, item) => {
    const lineTotal = Number(item.rate) * Number(item.qty);
    const gst = Number(item.gst || 0);
    if (gst <= 0) return sum;
    const baseAmount = lineTotal / (1 + gst / 100);
    return sum + (lineTotal - baseAmount);
  }, 0);
  const subTotal = grandTotal - gstAmount;
  const discountAmount = Math.min(Number(coupon?.discountAmount || 0), grandTotal);
  const payableTotal = Math.max(grandTotal - discountAmount, 0);
  const statusSteps = [
    {
      key: "new",
      title: "Order sent",
      text: "Your order has reached the counter.",
      icon: Clock,
    },
    {
      key: "accepted",
      title: "Accepted",
      text: "The restaurant has accepted your order.",
      icon: CheckCircle2,
    },
    {
      key: "preparing",
      title: "Preparing",
      text: "Your order is being prepared in the kitchen.",
      icon: ChefHat,
    },
    {
      key: "ready",
      title: "Ready",
      text: "Your order is ready and will be served soon.",
      icon: PackageCheck,
    },
  ];
  const statusRank = { new: 0, accepted: 1, preparing: 2, ready: 3, served: 4, cancelled: -1 };
  const currentStatusRank = statusRank[orderPlaced?.status] ?? 0;

  useEffect(() => {
    if (cart.length === 0) setCheckoutStep("cart");
  }, [cart.length]);

  const placeOrder = async () => {
    if (cart.length === 0) return showToast("Please add a menu item first", "warning");
    if (!customer.customerName.trim() || !customer.customerPhone.trim()) {
      return showToast("Name and contact number required", "warning");
    }
    if (isDelivery && (!customer.customerEmail.trim() || !customer.deliveryAddress.trim())) {
      return showToast("Email and address are required for delivery", "warning");
    }

    setPlacing(true);

    try {
      const res = await API.post("/restaurant-orders", {
        orderType: isDelivery ? "delivery" : "dine-in",
        tableNo: isDelivery ? "" : tableNo,
        ...customer,
        couponCode: coupon?.code || "",
        items: cart.map((item) => ({ productId: item.productId, qty: item.qty })),
      });

      setOrderPlaced(res.data.order);
      setCart([]);
      setCheckoutStep("cart");
      setCoupon(null);
      setCouponCode("");
      setCustomer({ customerName: "", customerPhone: "", customerEmail: "", deliveryAddress: "", note: "" });
      showToast("Order sent to the counter", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Order could not be placed");
    } finally {
      setPlacing(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return showToast("Enter a coupon code", "warning");
    if (grandTotal <= 0) return showToast("Add an item before applying a coupon", "warning");

    setApplyingCoupon(true);

    try {
      const res = await API.post("/coupons/apply", {
        code: couponCode.trim(),
        billAmount: grandTotal,
      });
      setCoupon({
        ...res.data.coupon,
        discountAmount: Number(res.data.discountAmount || 0),
      });
      showToast("Coupon applied", "success");
    } catch (error) {
      setCoupon(null);
      showToast(error.response?.data?.message || "Coupon could not be applied");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponCode("");
  };

  const startCheckout = () => {
    if (cart.length === 0) return showToast("Please add a menu item first", "warning");
    setCheckoutStep("details");
    window.setTimeout(() => {
      cartPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const renderProductCard = (product, index) => {
    const cartItem = cart.find((item) => item.productId === product._id);
    const hue = ["#f97316", "#16a34a", "#2563eb", "#dc2626", "#7c3aed"][index % 5];

    return (
      <article className="menu-product-card" key={product._id}>
        <div className="menu-food-art" style={{ backgroundColor: product.image ? "#ffffff" : hue }}>
          {product.image ? (
            <img src={product.image} alt={product.name} />
          ) : (
            <span>{product.name?.slice(0, 1) || "M"}</span>
          )}
        </div>
        <div className="menu-product-info">
          <span>{product.category || "Recommended"}</span>
          <h2>{product.name}</h2>
          <div className="customer-item-badges">
            <small className={isNonVeg(product) ? "food-type non-veg" : "food-type veg"}>
              {isNonVeg(product) ? <Flame size={12} /> : <Leaf size={12} />}
              {isNonVeg(product) ? "Non-Veg" : "Veg"}
            </small>
            {product.isRecommended && <small className="recommended-chip"><Sparkles size={12} /> Best</small>}
          </div>
          {product.description && <p>{product.description}</p>}
          <p>{Number(product.gst || 0) > 0 ? `${product.gst}% GST included` : "No GST applied"}</p>
          <strong>Rs {Number(product.mrp || product.sellingPrice || 0).toFixed(2)}</strong>
        </div>
        <div className="menu-add-control">
          {cartItem ? (
            <>
              <button onClick={() => updateCart(product, -1)} title="Remove one">
                <Minus size={16} />
              </button>
              <b>{cartItem.qty}</b>
              <button onClick={() => updateCart(product, 1)} title="Add one">
                <Plus size={16} />
              </button>
            </>
          ) : (
            <button onClick={() => updateCart(product, 1)}>Add</button>
          )}
        </div>
      </article>
    );
  };

  const renderMenuSection = (title, type, categoryMap) => {
    const categoryGroups = Object.entries(categoryMap);
    if (categoryGroups.length === 0) return null;

    return (
      <section className={`customer-menu-section ${type}`}>
        <div className="customer-menu-section-head">
          <h2>{title}</h2>
          <span>{categoryGroups.reduce((sum, [, list]) => sum + list.length, 0)} items</span>
        </div>

        {categoryGroups.map(([category, categoryProducts]) => (
          <div className="customer-category-block" key={`${type}-${category}`}>
            <div className="customer-category-head">
              <h3>{category}</h3>
              <span>{categoryProducts.length}</span>
            </div>
            <div className="menu-product-grid">
              {categoryProducts.map((product, index) => renderProductCard(product, index))}
            </div>
          </div>
        ))}
      </section>
    );
  };

  return (
    <div className={`customer-menu-page ${checkoutStep === "details" ? "checkout-open" : ""}`}>
      <ToastViewport toast={toast} />

      {menuLoading && (
        <div className="customer-page-preloader">
          <img src="/customer_preloader.gif" alt="Loading menu" />
        </div>
      )}

      <header className="menu-hero">
        <div>
          <span><Utensils size={16} /> {isDelivery ? "Delivery Order" : `Table ${tableNo}`}</span>
          <h1>{isDelivery ? "Order for delivery" : "Scan, choose, order"}</h1>
          <p>{isDelivery ? "Place your delivery order from this QR. Delivery details are required." : "Select items from the fresh menu. Your order will go directly to the counter."}</p>
        </div>
        <div className="menu-hero-total">
          <small>Your cart</small>
          <strong>Rs {payableTotal.toFixed(2)}</strong>
          <b>{cartQty} items</b>
        </div>
      </header>

      {orderPlaced && (
        <section className={`order-tracking-panel ${orderPlaced.status}`}>
          <div className="order-placed-animation">
            <PublicLottie path="/order_placed.json" loop={false} />
          </div>
          <div className="order-tracking-head">
            <div>
              <span>{orderPlaced.orderNo}</span>
              <h2>
                {orderPlaced.status === "cancelled"
                  ? "Order cancelled"
                  : orderPlaced.status === "served"
                    ? "Order served"
                    : "Order status"}
              </h2>
              <p>{orderPlaced.orderType === "delivery" ? "Delivery order" : `Table ${orderPlaced.tableNo}`} | Live updates will appear here.</p>
            </div>
            <b>{orderPlaced.status}</b>
          </div>

          <div className="customer-status-timeline">
            {statusSteps.map((step, index) => {
              const Icon = step.icon;
              const done = currentStatusRank >= index;

              return (
                <div className={done ? "done" : ""} key={step.key}>
                  <i><Icon size={18} /></i>
                  <strong>{step.title}</strong>
                  <span>{step.text}</span>
                </div>
              );
            })}
          </div>

          {orderPlaced.status === "cancelled" && (
            <p className="customer-order-cancelled">
              Sorry, the restaurant cancelled this order. Please contact the staff.
            </p>
          )}

          <div className="customer-order-items">
            {orderPlaced.items?.map((item, index) => (
              <p key={`${item.productId}-${index}`}>
                <span>{item.qty} x {item.name}</span>
                <b>Rs {Number(item.total || 0).toFixed(2)}</b>
              </p>
            ))}
          </div>
        </section>
      )}

      <div className="menu-search">
        <Search size={18} />
        <input
          placeholder="Search food items, category, taste..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <main className="menu-layout">
        <section className="order-menu-browser">
          <aside className="customer-category-sidebar">
            <div className="food-filter-tabs">
              <button
                className={activeFoodType === "all" ? "active" : ""}
                onClick={() => setActiveFoodType("all")}
                type="button"
              >
                All
              </button>
              <button
                className={activeFoodType === "veg" ? "active veg" : ""}
                onClick={() => setActiveFoodType("veg")}
                type="button"
              >
                <Leaf size={16} />
                Veg
              </button>
        <button
          className={activeFoodType === "non-veg" ? "active non-veg" : ""}
          onClick={() => setActiveFoodType("non-veg")}
          type="button"
        >
          <Flame size={16} />
          Non Veg
        </button>
            </div>

            <nav className="customer-category-list">
              {categoryStats.map((category) => (
                <button
                  key={category.name}
                  className={activeCategory === category.name ? "active" : ""}
                  onClick={() => setActiveCategory(category.name)}
                  type="button"
                >
                  <span>{category.name}</span>
                  <b>{category.count}</b>
                </button>
              ))}
            </nav>
          </aside>

          <div className="customer-items-pane">
            {renderMenuSection("Veg Menu", "veg", groupedMenu.veg)}
            {renderMenuSection("Non-Veg Menu", "non-veg", groupedMenu.nonVeg)}
            {visibleProducts.length === 0 && (
              <div className="restaurant-empty compact">No menu item found.</div>
            )}
          </div>
        </section>

        <aside className="menu-cart-panel" ref={cartPanelRef}>
          <div className="menu-cart-head">
            <ShoppingBag size={19} />
            <h2>Your Order</h2>
          </div>

          {cart.length === 0 ? (
            <p className="empty-cart-copy">Add items from the menu.</p>
          ) : (
            <div className="menu-cart-items">
              {cart.map((item) => (
                <div key={item.productId}>
                  <span>{item.name}</span>
                  <b>{item.qty} x Rs {item.rate}</b>
                </div>
              ))}
            </div>
          )}

          {checkoutStep === "details" && (
            <div className="customer-details-step">
              <div className="checkout-step-head">
                <button type="button" onClick={() => setCheckoutStep("cart")}>Back</button>
                <span>Final details</span>
              </div>
              <input
                placeholder="Customer name *"
                value={customer.customerName}
                onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })}
              />
              <PhoneInput
                placeholder="Contact number"
                value={customer.customerPhone}
                onChange={(value) => setCustomer({ ...customer, customerPhone: value })}
                required
              />
              <input
                placeholder={isDelivery ? "Email *" : "Email optional"}
                value={customer.customerEmail}
                onChange={(e) => setCustomer({ ...customer, customerEmail: e.target.value })}
              />
              <textarea
                placeholder={isDelivery ? "Delivery address *" : "Address optional"}
                value={customer.deliveryAddress}
                onChange={(e) => setCustomer({ ...customer, deliveryAddress: e.target.value })}
              />
              <textarea
                placeholder="Cooking note optional"
                value={customer.note}
                onChange={(e) => setCustomer({ ...customer, note: e.target.value })}
              />

              <div className="customer-coupon-box">
                <div className="menu-cart-head">
                  <BadgePercent size={18} />
                  <h2>Coupon</h2>
                </div>
                <div className="coupon-apply-row">
                  <input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={Boolean(coupon)}
                  />
                  {coupon ? (
                    <button type="button" onClick={removeCoupon}>Remove</button>
                  ) : (
                    <button type="button" disabled={applyingCoupon} onClick={applyCoupon}>
                      {applyingCoupon ? "Checking" : "Apply"}
                    </button>
                  )}
                </div>
                {coupon && (
                  <p>
                    <span>{coupon.code}</span>
                    <b>- Rs {discountAmount.toFixed(2)}</b>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="menu-total-lines">
            <p><span>{gstAmount > 0 ? "Base Price" : "Price"}</span><b>Rs {subTotal.toFixed(2)}</b></p>
            {gstAmount > 0 && <p><span>GST Included</span><b>Rs {gstAmount.toFixed(2)}</b></p>}
            {discountAmount > 0 && <p><span>Coupon Discount</span><b>- Rs {discountAmount.toFixed(2)}</b></p>}
            <h3><span>Total</span><b>Rs {payableTotal.toFixed(2)}</b></h3>
          </div>

          {checkoutStep === "cart" ? (
            <button disabled={cart.length === 0} onClick={startCheckout}>
              Continue
            </button>
          ) : (
            <button disabled={placing || cart.length === 0} onClick={placeOrder}>
              {placing ? "Sending..." : "Place Order"}
            </button>
          )}
        </aside>
      </main>

      {cart.length > 0 && !orderPlaced && (
        <div className="mobile-cart-cta">
          <div>
            <span>{cartQty} items</span>
            <strong>Rs {payableTotal.toFixed(2)}</strong>
          </div>
          {checkoutStep === "cart" ? (
            <button type="button" onClick={startCheckout}>
              Continue
            </button>
          ) : (
            <button type="button" disabled={placing} onClick={placeOrder}>
              {placing ? "Sending..." : "Place Order"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
