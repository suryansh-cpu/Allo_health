/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./src/components/CartContext.tsx":
/*!****************************************!*\
  !*** ./src/components/CartContext.tsx ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   CartProvider: () => (/* binding */ CartProvider),\n/* harmony export */   useCart: () => (/* binding */ useCart)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n\n\nconst CartContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)(null);\nfunction CartProvider({ children }) {\n    const [items, setItems] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)([]);\n    const addItem = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)((newItem)=>{\n        setItems((prev)=>{\n            const existing = prev.find((i)=>i.productId === newItem.productId && i.warehouseId === newItem.warehouseId);\n            if (existing) {\n                return prev.map((i)=>i.productId === newItem.productId && i.warehouseId === newItem.warehouseId ? {\n                        ...i,\n                        quantity: Math.min(i.quantity + 1, i.availableUnits)\n                    } : i);\n            }\n            return [\n                ...prev,\n                {\n                    ...newItem,\n                    quantity: 1\n                }\n            ];\n        });\n    }, []);\n    const removeItem = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)((productId, warehouseId)=>{\n        setItems((prev)=>prev.filter((i)=>!(i.productId === productId && i.warehouseId === warehouseId)));\n    }, []);\n    const updateQuantity = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)((productId, warehouseId, quantity)=>{\n        if (quantity <= 0) {\n            setItems((prev)=>prev.filter((i)=>!(i.productId === productId && i.warehouseId === warehouseId)));\n            return;\n        }\n        setItems((prev)=>prev.map((i)=>i.productId === productId && i.warehouseId === warehouseId ? {\n                    ...i,\n                    quantity\n                } : i));\n    }, []);\n    const clearCart = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(()=>setItems([]), []);\n    const totalItems = items.reduce((s, i)=>s + i.quantity, 0);\n    const totalPrice = items.reduce((s, i)=>s + i.productPrice * i.quantity, 0);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(CartContext.Provider, {\n        value: {\n            items,\n            addItem,\n            removeItem,\n            updateQuantity,\n            clearCart,\n            totalItems,\n            totalPrice\n        },\n        children: children\n    }, void 0, false, {\n        fileName: \"/Users/macbookpro/Documents/Allo_health/src/components/CartContext.tsx\",\n        lineNumber: 72,\n        columnNumber: 5\n    }, this);\n}\nfunction useCart() {\n    const ctx = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(CartContext);\n    if (!ctx) throw new Error(\"useCart must be used inside CartProvider\");\n    return ctx;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvY29tcG9uZW50cy9DYXJ0Q29udGV4dC50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFvRjtBQXdCcEYsTUFBTUksNEJBQWNKLG9EQUFhQSxDQUEwQjtBQUVwRCxTQUFTSyxhQUFhLEVBQUVDLFFBQVEsRUFBMkI7SUFDaEUsTUFBTSxDQUFDQyxPQUFPQyxTQUFTLEdBQUdOLCtDQUFRQSxDQUFhLEVBQUU7SUFFakQsTUFBTU8sVUFBVU4sa0RBQVdBLENBQUMsQ0FBQ087UUFDM0JGLFNBQVMsQ0FBQ0c7WUFDUixNQUFNQyxXQUFXRCxLQUFLRSxJQUFJLENBQ3hCLENBQUNDLElBQU1BLEVBQUVDLFNBQVMsS0FBS0wsUUFBUUssU0FBUyxJQUFJRCxFQUFFRSxXQUFXLEtBQUtOLFFBQVFNLFdBQVc7WUFFbkYsSUFBSUosVUFBVTtnQkFDWixPQUFPRCxLQUFLTSxHQUFHLENBQUMsQ0FBQ0gsSUFDZkEsRUFBRUMsU0FBUyxLQUFLTCxRQUFRSyxTQUFTLElBQUlELEVBQUVFLFdBQVcsS0FBS04sUUFBUU0sV0FBVyxHQUN0RTt3QkFBRSxHQUFHRixDQUFDO3dCQUFFSSxVQUFVQyxLQUFLQyxHQUFHLENBQUNOLEVBQUVJLFFBQVEsR0FBRyxHQUFHSixFQUFFTyxjQUFjO29CQUFFLElBQzdEUDtZQUVSO1lBQ0EsT0FBTzttQkFBSUg7Z0JBQU07b0JBQUUsR0FBR0QsT0FBTztvQkFBRVEsVUFBVTtnQkFBRTthQUFFO1FBQy9DO0lBQ0YsR0FBRyxFQUFFO0lBRUwsTUFBTUksYUFBYW5CLGtEQUFXQSxDQUFDLENBQUNZLFdBQW1CQztRQUNqRFIsU0FBUyxDQUFDRyxPQUNSQSxLQUFLWSxNQUFNLENBQUMsQ0FBQ1QsSUFBTSxDQUFFQSxDQUFBQSxFQUFFQyxTQUFTLEtBQUtBLGFBQWFELEVBQUVFLFdBQVcsS0FBS0EsV0FBVTtJQUVsRixHQUFHLEVBQUU7SUFFTCxNQUFNUSxpQkFBaUJyQixrREFBV0EsQ0FBQyxDQUFDWSxXQUFtQkMsYUFBcUJFO1FBQzFFLElBQUlBLFlBQVksR0FBRztZQUNqQlYsU0FBUyxDQUFDRyxPQUNSQSxLQUFLWSxNQUFNLENBQUMsQ0FBQ1QsSUFBTSxDQUFFQSxDQUFBQSxFQUFFQyxTQUFTLEtBQUtBLGFBQWFELEVBQUVFLFdBQVcsS0FBS0EsV0FBVTtZQUVoRjtRQUNGO1FBQ0FSLFNBQVMsQ0FBQ0csT0FDUkEsS0FBS00sR0FBRyxDQUFDLENBQUNILElBQ1JBLEVBQUVDLFNBQVMsS0FBS0EsYUFBYUQsRUFBRUUsV0FBVyxLQUFLQSxjQUFjO29CQUFFLEdBQUdGLENBQUM7b0JBQUVJO2dCQUFTLElBQUlKO0lBR3hGLEdBQUcsRUFBRTtJQUVMLE1BQU1XLFlBQVl0QixrREFBV0EsQ0FBQyxJQUFNSyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBRXBELE1BQU1rQixhQUFhbkIsTUFBTW9CLE1BQU0sQ0FBQyxDQUFDQyxHQUFHZCxJQUFNYyxJQUFJZCxFQUFFSSxRQUFRLEVBQUU7SUFDMUQsTUFBTVcsYUFBYXRCLE1BQU1vQixNQUFNLENBQUMsQ0FBQ0MsR0FBR2QsSUFBTWMsSUFBSWQsRUFBRWdCLFlBQVksR0FBR2hCLEVBQUVJLFFBQVEsRUFBRTtJQUUzRSxxQkFDRSw4REFBQ2QsWUFBWTJCLFFBQVE7UUFBQ0MsT0FBTztZQUFFekI7WUFBT0U7WUFBU2E7WUFBWUU7WUFBZ0JDO1lBQVdDO1lBQVlHO1FBQVc7a0JBQzFHdkI7Ozs7OztBQUdQO0FBRU8sU0FBUzJCO0lBQ2QsTUFBTUMsTUFBTWpDLGlEQUFVQSxDQUFDRztJQUN2QixJQUFJLENBQUM4QixLQUFLLE1BQU0sSUFBSUMsTUFBTTtJQUMxQixPQUFPRDtBQUNUIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYWxsby1wbGF0Zm9ybS8uL3NyYy9jb21wb25lbnRzL0NhcnRDb250ZXh0LnRzeD82MDhkIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUNvbnRleHQsIHVzZUNvbnRleHQsIHVzZVN0YXRlLCB1c2VDYWxsYmFjaywgUmVhY3ROb2RlIH0gZnJvbSAncmVhY3QnO1xuXG5leHBvcnQgaW50ZXJmYWNlIENhcnRJdGVtIHtcbiAgcHJvZHVjdElkOiBzdHJpbmc7XG4gIHByb2R1Y3ROYW1lOiBzdHJpbmc7XG4gIHByb2R1Y3RQcmljZTogbnVtYmVyO1xuICBwcm9kdWN0Q2F0ZWdvcnk6IHN0cmluZztcbiAgd2FyZWhvdXNlSWQ6IHN0cmluZztcbiAgd2FyZWhvdXNlTmFtZTogc3RyaW5nO1xuICB3YXJlaG91c2VMb2NhdGlvbjogc3RyaW5nO1xuICBxdWFudGl0eTogbnVtYmVyO1xuICBhdmFpbGFibGVVbml0czogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgQ2FydENvbnRleHRWYWx1ZSB7XG4gIGl0ZW1zOiBDYXJ0SXRlbVtdO1xuICBhZGRJdGVtOiAoaXRlbTogT21pdDxDYXJ0SXRlbSwgJ3F1YW50aXR5Jz4pID0+IHZvaWQ7XG4gIHJlbW92ZUl0ZW06IChwcm9kdWN0SWQ6IHN0cmluZywgd2FyZWhvdXNlSWQ6IHN0cmluZykgPT4gdm9pZDtcbiAgdXBkYXRlUXVhbnRpdHk6IChwcm9kdWN0SWQ6IHN0cmluZywgd2FyZWhvdXNlSWQ6IHN0cmluZywgcXVhbnRpdHk6IG51bWJlcikgPT4gdm9pZDtcbiAgY2xlYXJDYXJ0OiAoKSA9PiB2b2lkO1xuICB0b3RhbEl0ZW1zOiBudW1iZXI7XG4gIHRvdGFsUHJpY2U6IG51bWJlcjtcbn1cblxuY29uc3QgQ2FydENvbnRleHQgPSBjcmVhdGVDb250ZXh0PENhcnRDb250ZXh0VmFsdWUgfCBudWxsPihudWxsKTtcblxuZXhwb3J0IGZ1bmN0aW9uIENhcnRQcm92aWRlcih7IGNoaWxkcmVuIH06IHsgY2hpbGRyZW46IFJlYWN0Tm9kZSB9KSB7XG4gIGNvbnN0IFtpdGVtcywgc2V0SXRlbXNdID0gdXNlU3RhdGU8Q2FydEl0ZW1bXT4oW10pO1xuXG4gIGNvbnN0IGFkZEl0ZW0gPSB1c2VDYWxsYmFjaygobmV3SXRlbTogT21pdDxDYXJ0SXRlbSwgJ3F1YW50aXR5Jz4pID0+IHtcbiAgICBzZXRJdGVtcygocHJldikgPT4ge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBwcmV2LmZpbmQoXG4gICAgICAgIChpKSA9PiBpLnByb2R1Y3RJZCA9PT0gbmV3SXRlbS5wcm9kdWN0SWQgJiYgaS53YXJlaG91c2VJZCA9PT0gbmV3SXRlbS53YXJlaG91c2VJZCxcbiAgICAgICk7XG4gICAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgICAgcmV0dXJuIHByZXYubWFwKChpKSA9PlxuICAgICAgICAgIGkucHJvZHVjdElkID09PSBuZXdJdGVtLnByb2R1Y3RJZCAmJiBpLndhcmVob3VzZUlkID09PSBuZXdJdGVtLndhcmVob3VzZUlkXG4gICAgICAgICAgICA/IHsgLi4uaSwgcXVhbnRpdHk6IE1hdGgubWluKGkucXVhbnRpdHkgKyAxLCBpLmF2YWlsYWJsZVVuaXRzKSB9XG4gICAgICAgICAgICA6IGksXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gWy4uLnByZXYsIHsgLi4ubmV3SXRlbSwgcXVhbnRpdHk6IDEgfV07XG4gICAgfSk7XG4gIH0sIFtdKTtcblxuICBjb25zdCByZW1vdmVJdGVtID0gdXNlQ2FsbGJhY2soKHByb2R1Y3RJZDogc3RyaW5nLCB3YXJlaG91c2VJZDogc3RyaW5nKSA9PiB7XG4gICAgc2V0SXRlbXMoKHByZXYpID0+XG4gICAgICBwcmV2LmZpbHRlcigoaSkgPT4gIShpLnByb2R1Y3RJZCA9PT0gcHJvZHVjdElkICYmIGkud2FyZWhvdXNlSWQgPT09IHdhcmVob3VzZUlkKSksXG4gICAgKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHVwZGF0ZVF1YW50aXR5ID0gdXNlQ2FsbGJhY2soKHByb2R1Y3RJZDogc3RyaW5nLCB3YXJlaG91c2VJZDogc3RyaW5nLCBxdWFudGl0eTogbnVtYmVyKSA9PiB7XG4gICAgaWYgKHF1YW50aXR5IDw9IDApIHtcbiAgICAgIHNldEl0ZW1zKChwcmV2KSA9PlxuICAgICAgICBwcmV2LmZpbHRlcigoaSkgPT4gIShpLnByb2R1Y3RJZCA9PT0gcHJvZHVjdElkICYmIGkud2FyZWhvdXNlSWQgPT09IHdhcmVob3VzZUlkKSksXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzZXRJdGVtcygocHJldikgPT5cbiAgICAgIHByZXYubWFwKChpKSA9PlxuICAgICAgICBpLnByb2R1Y3RJZCA9PT0gcHJvZHVjdElkICYmIGkud2FyZWhvdXNlSWQgPT09IHdhcmVob3VzZUlkID8geyAuLi5pLCBxdWFudGl0eSB9IDogaSxcbiAgICAgICksXG4gICAgKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IGNsZWFyQ2FydCA9IHVzZUNhbGxiYWNrKCgpID0+IHNldEl0ZW1zKFtdKSwgW10pO1xuXG4gIGNvbnN0IHRvdGFsSXRlbXMgPSBpdGVtcy5yZWR1Y2UoKHMsIGkpID0+IHMgKyBpLnF1YW50aXR5LCAwKTtcbiAgY29uc3QgdG90YWxQcmljZSA9IGl0ZW1zLnJlZHVjZSgocywgaSkgPT4gcyArIGkucHJvZHVjdFByaWNlICogaS5xdWFudGl0eSwgMCk7XG5cbiAgcmV0dXJuIChcbiAgICA8Q2FydENvbnRleHQuUHJvdmlkZXIgdmFsdWU9e3sgaXRlbXMsIGFkZEl0ZW0sIHJlbW92ZUl0ZW0sIHVwZGF0ZVF1YW50aXR5LCBjbGVhckNhcnQsIHRvdGFsSXRlbXMsIHRvdGFsUHJpY2UgfX0+XG4gICAgICB7Y2hpbGRyZW59XG4gICAgPC9DYXJ0Q29udGV4dC5Qcm92aWRlcj5cbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZUNhcnQoKSB7XG4gIGNvbnN0IGN0eCA9IHVzZUNvbnRleHQoQ2FydENvbnRleHQpO1xuICBpZiAoIWN0eCkgdGhyb3cgbmV3IEVycm9yKCd1c2VDYXJ0IG11c3QgYmUgdXNlZCBpbnNpZGUgQ2FydFByb3ZpZGVyJyk7XG4gIHJldHVybiBjdHg7XG59Il0sIm5hbWVzIjpbImNyZWF0ZUNvbnRleHQiLCJ1c2VDb250ZXh0IiwidXNlU3RhdGUiLCJ1c2VDYWxsYmFjayIsIkNhcnRDb250ZXh0IiwiQ2FydFByb3ZpZGVyIiwiY2hpbGRyZW4iLCJpdGVtcyIsInNldEl0ZW1zIiwiYWRkSXRlbSIsIm5ld0l0ZW0iLCJwcmV2IiwiZXhpc3RpbmciLCJmaW5kIiwiaSIsInByb2R1Y3RJZCIsIndhcmVob3VzZUlkIiwibWFwIiwicXVhbnRpdHkiLCJNYXRoIiwibWluIiwiYXZhaWxhYmxlVW5pdHMiLCJyZW1vdmVJdGVtIiwiZmlsdGVyIiwidXBkYXRlUXVhbnRpdHkiLCJjbGVhckNhcnQiLCJ0b3RhbEl0ZW1zIiwicmVkdWNlIiwicyIsInRvdGFsUHJpY2UiLCJwcm9kdWN0UHJpY2UiLCJQcm92aWRlciIsInZhbHVlIiwidXNlQ2FydCIsImN0eCIsIkVycm9yIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./src/components/CartContext.tsx\n");

/***/ }),

/***/ "./src/pages/_app.tsx":
/*!****************************!*\
  !*** ./src/pages/_app.tsx ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../styles/globals.css */ \"./src/styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _components_CartContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../components/CartContext */ \"./src/components/CartContext.tsx\");\n\n\n\nfunction App({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_CartContext__WEBPACK_IMPORTED_MODULE_2__.CartProvider, {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n            ...pageProps\n        }, void 0, false, {\n            fileName: \"/Users/macbookpro/Documents/Allo_health/src/pages/_app.tsx\",\n            lineNumber: 8,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"/Users/macbookpro/Documents/Allo_health/src/pages/_app.tsx\",\n        lineNumber: 7,\n        columnNumber: 5\n    }, this);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvcGFnZXMvX2FwcC50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUMrQjtBQUMwQjtBQUUxQyxTQUFTQyxJQUFJLEVBQUVDLFNBQVMsRUFBRUMsU0FBUyxFQUFZO0lBQzVELHFCQUNFLDhEQUFDSCxpRUFBWUE7a0JBQ1gsNEVBQUNFO1lBQVcsR0FBR0MsU0FBUzs7Ozs7Ozs7Ozs7QUFHOUIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9hbGxvLXBsYXRmb3JtLy4vc3JjL3BhZ2VzL19hcHAudHN4P2Y5ZDYiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBBcHBQcm9wcyB9IGZyb20gJ25leHQvYXBwJztcbmltcG9ydCAnLi4vc3R5bGVzL2dsb2JhbHMuY3NzJztcbmltcG9ydCB7IENhcnRQcm92aWRlciB9IGZyb20gJy4uL2NvbXBvbmVudHMvQ2FydENvbnRleHQnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBcHAoeyBDb21wb25lbnQsIHBhZ2VQcm9wcyB9OiBBcHBQcm9wcykge1xuICByZXR1cm4gKFxuICAgIDxDYXJ0UHJvdmlkZXI+XG4gICAgICA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+XG4gICAgPC9DYXJ0UHJvdmlkZXI+XG4gICk7XG59XG4iXSwibmFtZXMiOlsiQ2FydFByb3ZpZGVyIiwiQXBwIiwiQ29tcG9uZW50IiwicGFnZVByb3BzIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./src/pages/_app.tsx\n");

/***/ }),

/***/ "./src/styles/globals.css":
/*!********************************!*\
  !*** ./src/styles/globals.css ***!
  \********************************/
/***/ (() => {



/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("./src/pages/_app.tsx"));
module.exports = __webpack_exports__;

})();