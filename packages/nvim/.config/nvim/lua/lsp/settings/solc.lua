-- targets can be one of ewasm, generic, sabre, solana, substrate
return {
    -- cmd = { "solc", "--base-path", ".", "--include-path", "node_modules/", "--lsp" }, [not supported by solc yet]
    root_dir = function(fname)
        local git_root = require("lspconfig").util.find_git_ancestor(fname)
        local pkg_root = require("lspconfig").util.find_package_json_ancestor(fname)

        if git_root then
            return git_root
        elseif pkg_root then
            return pkg_root
        end
    end,
}
