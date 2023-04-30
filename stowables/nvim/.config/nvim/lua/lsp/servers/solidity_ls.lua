return {
    root_dir = function(fname)
        local pkg_root = require("lspconfig").util.find_package_json_ancestor(fname)
        return pkg_root
    end,
    settings = {
        solidity = {
            packageDefaultDependenciesContractDirectory = "",
            packageDefaultDependenciesDirectory = "node_modules",
            enabledAsYouTypeCompilationErrorCheck = true,
            -- linter = "solhint",
        },
    },
}
