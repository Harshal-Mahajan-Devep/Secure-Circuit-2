import React, { useState, useEffect } from "react";
import axios from "axios";
import { BASE_URL } from "../Config/Base-url";
import toast from "react-hot-toast";

function Approved() {
  const [quotations, setQuotations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [assignRemark, setAssignRemark] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // =========================
  // REMARK MODAL
  // =========================
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedRemark, setSelectedRemark] = useState("");

  // =========================
  // GET DATA
  // =========================
  useEffect(() => {
    getorderData();
    getSuppliers();
  }, []);

  // =========================
  // GET APPROVED ORDERS
  // =========================
  const getorderData = async () => {
    setLoading(true);
    setError(null);

    try {
      const stages = [8, 9, 10, 11, 12];

      const responses = await Promise.all(
        stages.map((stage) =>
          axios.get(
            `${BASE_URL}admin/getdatawhere/tbl_orders/order_stage/${stage}`
          )
        )
      );

      let allOrders = [];

      responses.forEach((response) => {
        if (response.data.status && response.data.data) {
          const data = Array.isArray(response.data.data)
            ? response.data.data
            : [response.data.data];

          allOrders = [...allOrders, ...data];
        }
      });

      // Duplicate order remove
      const uniqueOrders = Array.from(
        new Map(
          allOrders.map((item) => [
            String(item.order_id),
            item,
          ])
        ).values()
      );

      // Stage 8 -> 12 order
      uniqueOrders.sort(
        (a, b) =>
          Number(a.order_stage || 0) -
          Number(b.order_stage || 0)
      );

      console.log("Stage 8-12 Orders:", uniqueOrders);

      setQuotations(uniqueOrders);

    } catch (err) {
      console.error("Order error:", err);

      setError("Failed to fetch data.");
      toast.error("Failed to load data!");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // GET SUPPLIERS
  // =========================
  const getSuppliers = async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}admin/getdata/tbl_suppliers`
      );

      console.log("Suppliers:", response.data);

      if (response.data.status) {
        setSuppliers(
          Array.isArray(response.data.data)
            ? response.data.data
            : [response.data.data]
        );
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      console.error("Supplier error:", err);

      toast.error("Failed to load suppliers!");
    }
  };

  // =========================
  // GET SUPPLIER NAME
  // =========================
  const getSupplierName = (supplierId) => {
    if (!supplierId) {
      return "N/A";
    }

    const supplier = suppliers.find(
      (item) => String(item.supp_id) === String(supplierId)
    );

    if (!supplier) {
      return "N/A";
    }

    return (
      supplier.supp_name ||
      supplier.supp_contact_person ||
      supplier.supp_company_name ||
      supplier.supp_code ||
      "Unnamed Supplier"
    );
  };

  // =========================
  // GET ASSIGNED SUPPLIER ID
  // =========================
  const getAssignedSupplierId = (order) => {
    if (!order) {
      return "";
    }

    /*
     * Priority:
     *
     * 1. assigned_supplier
     * 2. order_quote_supplier
     * 3. supp_id from JOIN
     */

    if (
      order.assigned_supplier &&
      String(order.assigned_supplier) !== "0"
    ) {
      return order.assigned_supplier;
    }

    if (
      order.order_quote_supplier &&
      String(order.order_quote_supplier) !== "0"
    ) {
      return order.order_quote_supplier;
    }

    if (
      order.supp_id &&
      String(order.supp_id) !== "0"
    ) {
      return order.supp_id;
    }

    return "";
  };

  // =========================
  // GET ASSIGNED SUPPLIER NAME
  // =========================
  const getAssignedSupplierName = (order) => {
    if (!order) {
      return "N/A";
    }

    const supplierId = getAssignedSupplierId(order);

    let supplier = null;

    if (supplierId) {
      supplier = suppliers.find(
        (item) => String(item.supp_id) === String(supplierId)
      );
    }

    // Supplier name
    const supplierName =
      order.supp_name ||
      order.supplier_name ||
      order.supp_contact_person ||
      supplier?.supp_name ||
      supplier?.supp_contact_person ||
      "Unnamed Supplier";

    // Company name
    const companyName =
      order.supp_company_name ||
      order.supplier_company_name ||
      supplier?.supp_company_name ||
      supplier?.supplier_company_name ||
      "";

    // Supplier Name (Company Name)
    if (companyName) {
      return `${supplierName} (${companyName})`;
    }

    return supplierName;
  };

  // =========================
  // OPEN ASSIGN SUPPLIER MODAL
  // =========================
  const handleOpenAssignModal = (order) => {
    console.log("Selected Order:", order);

    const supplierId = getAssignedSupplierId(order);
    const supplierName = getAssignedSupplierName(order);
    setSelectedOrder(order);

    /*
     * Existing assigned remark show
     */
    setAssignRemark(order.assigned_remark || "");

    setShowAssignModal(true);
  };

  // =========================
  // CLOSE ASSIGN SUPPLIER MODAL
  // =========================
  const handleCloseAssignModal = () => {
    if (assignLoading) {
      return;
    }

    setSelectedOrder(null);
    setAssignRemark("");
    setShowAssignModal(false);
  };

  // =========================
  // OPEN REMARK MODAL
  // =========================
  const handleOpenRemarkModal = (remark) => {
    setSelectedRemark(remark || "No remark available.");
    setShowRemarkModal(true);
  };

  // =========================
  // CLOSE REMARK MODAL
  // =========================
  const handleCloseRemarkModal = () => {
    setShowRemarkModal(false);
    setSelectedRemark("");
  };

  // =========================
  // ASSIGN SUPPLIER
  // =========================
  const handleAssignSupplier = async () => {
    if (!selectedOrder?.order_id) {
      toast.error("Order not selected!");
      return;
    }

    /*
     * Get supplier ID
     *
     * This will take:
     * assigned_supplier
     * OR order_quote_supplier
     * OR supp_id
     */
    const supplierId = getAssignedSupplierId(selectedOrder);

    if (!supplierId) {
      toast.error("Supplier ID not found!");

      console.log(
        "Supplier ID not found. Selected Order:",
        selectedOrder
      );

      return;
    }

    setAssignLoading(true);

    try {
      /*
       * Supplier name is only for display.
       *
       * Database will save supplier ID.
       */
      const payload = {
        assigned_supplier: supplierId,
        assigned_remark: assignRemark,
        order_stage:
          String(selectedOrder.cart_confirm_production_file).toLowerCase() === "yes"
            ? 11
            : 9,
      };


      const response = await axios.post(
        `${BASE_URL}admin/updatedata/tbl_orders/order_id/${selectedOrder.order_id}`,
        payload
      );

      console.log("Assign Response:", response.data);

      if (response.data.status) {
        toast.success("Supplier assigned successfully!");

        handleCloseAssignModal();

        // Refresh latest orders
        getorderData();
      } else {
        toast.error(
          response.data.message ||
          "Failed to assign supplier!"
        );
      }
    } catch (err) {
      console.error("Assign Supplier Error:", err);

      console.error(
        "API Error Response:",
        err.response?.data
      );

      toast.error(
        err.response?.data?.message ||
        "Failed to assign supplier!"
      );
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <>
      <div className="container-fluid px-3 px-lg-4 py-4">

        {/* =========================
            PAGE HEADING
        ========================= */}

        <div className="page-heading">
          <div className="page-heading-copy">

            <span className="page-icon">
              <i
                className="bi bi-file-text"
                aria-hidden="true"
              ></i>
            </span>

            <div>
              <p className="eyebrow mb-1">
                All
              </p>

              <h1 className="h3 mb-1">
                Approved
              </h1>
            </div>

          </div>
        </div>

        {/* =========================
            TABLE
        ========================= */}

        <section className="panel">
          <div className="table-responsive">

            <table
              className="table align-middle mb-0"
              id="ordersTable"
              data-searchable-table
            >

              <thead>
                <tr className="text-center">

                  <th>
                    Action
                  </th>

                  <th>
                    Order Code
                  </th>

                  <th>
                    Quotation
                  </th>

                  <th>
                    Remark
                  </th>

                  <th>
                    Status
                  </th>

                </tr>
              </thead>

              <tbody className="activity-date-time">

                {loading ? (

                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-4"
                    >
                      Loading...
                    </td>
                  </tr>

                ) : error ? (

                  <tr>
                    <td
                      colSpan="5"
                      className="text-center text-danger py-4"
                    >
                      {error}
                    </td>
                  </tr>

                ) : quotations.length === 0 ? (

                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-4"
                    >
                      No quotations found for Stage 8.
                    </td>
                  </tr>

                ) : (

                  quotations.map((item, index) => (

                    <tr
                      key={item.order_id || index}
                      className="text-center"
                    >

                      {/* =========================
                          ACTION
                      ========================= */}

                      <td>
                        {String(item.order_stage) === "8" && (
                          <button
                            type="button"
                            className="btn border-danger text-danger"
                            onClick={() => handleOpenAssignModal(item)}
                          >
                            Assign Supplier
                          </button>
                        )}

                        {String(item.order_stage) === "10" && (
                          item.order_design &&
                            String(item.order_design).trim() !== "" ? (
                            <a
                              href={`${BASE_URL}public/Uploads/${item.order_design}`}
                              className="btn border-danger text-danger"
                              target="_blank"
                              rel="noreferrer"
                            >
                              View Design
                            </a>
                          ) : (
                            <button
                              type="button"
                              className="btn border-danger text-danger"
                              disabled
                            >
                              View Design
                            </button>
                          )
                        )}
                      </td>

                      {/* =========================
                          ORDER CODE
                      ========================= */}

                      <td className="fw-bold">
                        {item.order_code || "N/A"}
                      </td>

                      {/* =========================
                          QUOTATION
                      ========================= */}

                      <td>

                        <a
                          href={`${BASE_URL}public/Uploads/${item.order_quotation}`}
                          className="text-danger fw-bold text-decoration-none"
                          style={{
                            cursor: "pointer",
                            fontSize: "16px",
                          }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View Quotations
                        </a>

                      </td>

                      {/* =========================
                          REMARK
                      ========================= */}

                      <td>
                        <div className="d-flex align-items-center justify-content-center flex-nowrap gap-1">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() =>
                              handleOpenRemarkModal(
                                item.order_remark
                              )
                            }
                          >

                            <i className="bi bi-eye me-1"></i>

                            Remark

                          </button>
                          <br />
                          {Number(item.order_stage) >= 9 && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() =>
                                handleOpenRemarkModal(
                                  item.assigned_remark
                                )
                              }
                            >

                              <i className="bi bi-eye me-1"></i>

                              Secure Team Remark

                            </button>
                          )}
                        </div>
                      </td>

                      <td>
                        {String(item.order_stage) === "8" && (
                          <span className="badge bg-warning text-dark">
                            Supplier Assign Pending
                          </span>
                        )}

                        {String(item.order_stage) === "9" && (
                          <span className="badge bg-info text-dark">
                            Design Send Pending
                          </span>
                        )}

                        {String(item.order_stage) === "10" && (
                          <span className="badge bg-warning text-dark">
                            Design Approval Pending
                          </span>
                        )}

                        {String(item.order_stage) === "11" && (
                          <span className="badge bg-primary">
                            Proceed for Production
                          </span>
                        )}

                        {String(item.order_stage) === "12" && (
                          <span className="badge bg-warning text-dark">
                            Quality Check
                          </span>
                        )}
                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>
        </section>

        {/* ==================================================
            REMARK MODAL
        ================================================== */}

        {showRemarkModal && (
          <>

            {/* Backdrop */}
            <div
              className="modal-backdrop fade show"
              onClick={handleCloseRemarkModal}
            ></div>

            {/* Modal */}
            <div
              className="modal fade show d-block"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
            >

              <div className="modal-dialog modal-dialog-centered">

                <div className="modal-content">

                  {/* Header */}
                  <div className="modal-header">

                    <h5 className="modal-title">
                      <i className="bi bi-chat-left-text me-2 text-primary"></i>
                      Remark
                    </h5>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={handleCloseRemarkModal}
                      aria-label="Close"
                    ></button>

                  </div>

                  {/* Body */}
                  <div className="modal-body">

                    <div
                      className="p-3 rounded"
                      style={{
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #dee2e6",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        minHeight: "80px",
                      }}
                    >
                      {selectedRemark}
                    </div>

                  </div>

                  {/* Footer */}
                  <div className="modal-footer">

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCloseRemarkModal}
                    >
                      Close
                    </button>

                  </div>

                </div>

              </div>

            </div>

          </>
        )}

        {/* ==================================================
            ASSIGN SUPPLIER MODAL
        ================================================== */}

        {showAssignModal && (

          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >

            <div className="modal-dialog modal-dialog-centered">

              <div className="modal-content">

                {/* =========================
                    HEADER
                ========================= */}

                <div
                  className="modal-header"
                  style={{
                    background:
                      "linear-gradient(135deg, #e00404, #661a1a)",
                    color: "#fff",
                  }}
                >

                  <h5 className="modal-title">
                    Assign Supplier
                  </h5>

                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={handleCloseAssignModal}
                    disabled={assignLoading}
                  ></button>

                </div>

                {/* =========================
                    BODY
                ========================= */}

                <div className="modal-body">

                  {/* SUPPLIER NAME */}

                  <div className="mb-3">

                    <label className="form-label fw-semibold">
                      Supplier Quote
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={getAssignedSupplierName(
                        selectedOrder
                      )}
                      readOnly
                    />

                  </div>

                  {/* SUPPLIER ID - OPTIONAL INFO */}



                  <input
                    type="hidden"
                    className="form-control"
                    value={getAssignedSupplierId(
                      selectedOrder
                    )}
                    readOnly
                  />



                  {/* REMARK */}

                  <div className="mb-3">

                    <label className="form-label fw-semibold">
                      Assign Remark
                    </label>

                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Enter remark"
                      value={assignRemark}
                      onChange={(e) =>
                        setAssignRemark(
                          e.target.value
                        )
                      }
                    ></textarea>

                  </div>

                </div>

                {/* =========================
                    FOOTER
                ========================= */}

                <div
                  className="modal-footer"
                  style={{
                    justifyContent: "space-between",
                  }}
                >

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseAssignModal}
                    disabled={assignLoading}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleAssignSupplier}
                    disabled={assignLoading}
                  >
                    {assignLoading
                      ? "Assigning..."
                      : "Assign Supplier"}
                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

      </div>
    </>
  );
}

export default Approved;