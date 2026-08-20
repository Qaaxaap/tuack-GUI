{
  description = "Development environment with pnpm, Node.js, and DBus development libraries";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      # 支持多系统，这里使用当前系统（也可显式指定如 "x86_64-linux"）
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs          # Node.js 运行时
          pnpm            # 包管理器
          dbus            # DBus 库及开发头文件（包含 pkg-config 信息）
          pkg-config      # 用于查找 dbus-1.pc
	  gdk-pixbuf.dev    # 提供 gdk-pixbuf-2.0
	  glib.dev
	  atk.dev
	  pango.dev
	  gtk3.dev
          libsoup_3.dev
          webkitgtk_4_1.dev

        ];

	nativeBuildInputs = with pkgs; [
          wrapGAppsHook4 
        ];
  	

        # 可选：显式设置环境变量（通常 pkg-config 自动处理）
        shellHook = ''
	  export GSETTINGS_SCHEMA_PATH="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}/glib-2.0/schemas"

    # 2. 设置数据目录（图标、主题、GTK 资源）
    #export XDG_DATA_DIRS="${pkgs.gtk4}/share:${pkgs.hicolor-icon-theme}/share:${pkgs.gsettings-desktop-schemas}/share:$XDG_DATA_DIRS"

    # 3. 设置 GObject Introspection 类型库路径（如果使用了 GI）
    #export GI_TYPELIB_PATH="${pkgs.gtk4}/lib/girepository-1.0:${pkgs.webkitgtk_4_1}/lib/girepository-1.0:$GI_TYPELIB_PATH"

    # 4. 设置 GDK 像素缓冲模块（图像格式支持）
    #export GDK_PIXBUF_MODULE_FILE="${pkgs.librsvg.out}/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache"

          export XDG_DATA_DIRS="$GSETTINGS_SCHEMAS_PATH"
          echo "DBus development libraries available."
        '';
      };
    };
}
