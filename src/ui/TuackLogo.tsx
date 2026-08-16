// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * tuack-ng 标志（doc/assets/icon.svg 的 GUI 内联版，viewBox 0 0 245 149）。
 * 原图白色部分（左右侧条、中间斜杠、四角菱形/圆点）改用 currentColor，
 * 自动跟随主题文字色：深色主题=白、浅色主题=黑；红/黄/蓝三色弧固定不变。
 */
export default function TuackLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 149) / 245}
      viewBox="0 0 245 149"
      fill="none"
      style={{ color: "var(--text)" }}
      aria-hidden="true"
    >
      {/* 中间斜杠 */}
      <path d="M107.15 42.4081L137.15 105.732" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      {/* 红 / 黄 / 蓝三色弧 */}
      <path
        d="M89.7797 105.33C85.3439 100.736 81.9364 95.251 79.7838 89.239C77.6313 83.227 76.7828 76.826 77.295 70.461C77.8071 64.096 79.668 57.9128 82.7541 52.3223C85.8402 46.7319 90.0807 41.8623 95.1939 38.0371"
        stroke="#B21D26"
        strokeWidth="7.5"
        strokeMiterlimit="2"
        strokeLinecap="round"
      />
      <path
        d="M111.264 30.4067C117.46 28.8619 123.913 28.6534 130.196 29.7952C136.479 30.937 142.447 33.4028 147.703 37.0289C152.959 40.655 157.384 45.3582 160.682 50.826C163.98 56.2939 166.077 62.4011 166.833 68.742"
        stroke="#EFCC6A"
        strokeWidth="7.5"
        strokeMiterlimit="2"
        strokeLinecap="round"
      />
      <path
        d="M165.407 86.474C163.647 92.612 160.6 98.305 156.47 103.176C152.34 108.046 147.22 111.981 141.452 114.72C135.684 117.459 129.398 118.939 123.014 119.062C116.629 119.184 110.292 117.947 104.423 115.431"
        stroke="#1A8CC9"
        strokeWidth="7.5"
        strokeMiterlimit="2"
        strokeLinecap="round"
      />
      {/* 右侧条 + 右上菱形角点 */}
      <circle cx="170.221" cy="141.072" r="5" fill="currentColor" />
      <rect x="237.227" y="66.9951" width="10.0046" height="99.7778" transform="rotate(45 237.227 66.9951)" fill="currentColor" />
      <path d="M163.15 7.07108L170.221 7.748e-06L173.757 3.53554L166.686 10.6066L163.15 7.07108Z" fill="currentColor" />
      <circle cx="5" cy="5" r="5" transform="matrix(1 0 0 -1 165.221 12.0711)" fill="currentColor" />
      <rect width="10.0046" height="99.7778" transform="matrix(0.707107 -0.707107 -0.707107 -0.707107 237.227 81.1475)" fill="currentColor" />
      {/* 左侧条 + 左下菱形角点 */}
      <circle cx="74.0804" cy="7.06998" r="5" transform="rotate(180 74.0804 7.06998)" fill="currentColor" />
      <rect x="7.07432" y="81.1464" width="10.0046" height="99.7778" transform="rotate(-135 7.07432 81.1464)" fill="currentColor" />
      <path d="M81.1515 141.07L74.0804 148.142L70.5449 144.606L77.6159 137.535L81.1515 141.07Z" fill="currentColor" />
      <circle cx="5" cy="5" r="5" transform="matrix(-1 0 0 1 79.0804 136.07)" fill="currentColor" />
      <rect width="10.0046" height="99.7778" transform="matrix(-0.707107 0.707107 0.707107 0.707107 7.07431 66.994)" fill="currentColor" />
    </svg>
  );
}
