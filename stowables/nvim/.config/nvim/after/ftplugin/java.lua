-- nvim-jdtls setup
-- https://github.com/mfussenegger/nvim-jdtls

local ok, jdtls = pcall(require, "jdtls")
if not ok then
    return
end

local root_markers = {
    "gradlew",
    "mvnw",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "settings.gradle",
    "settings.gradle.kts",
    ".git",
}

local root_dir = vim.fs.root(0, root_markers)
if not root_dir then
    return
end
root_dir = vim.fs.normalize(root_dir)

local jdtls_path = vim.fs.joinpath(vim.fn.stdpath("data"), "mason", "packages", "jdtls")
local launcher = vim.fn.glob(
    vim.fs.joinpath(jdtls_path, "plugins", "org.eclipse.equinox.launcher_*.jar")
)
if launcher == "" then
    vim.notify("jdtls is not installed. Run :MasonInstall jdtls", vim.log.levels.ERROR)
    return
end

local os_config = ({
    Darwin = "mac",
    Linux = "linux",
    Windows_NT = "win",
})[vim.uv.os_uname().sysname]
if not os_config then
    vim.notify("Unsupported OS for jdtls config", vim.log.levels.ERROR)
    return
end

local config_dir = vim.fs.joinpath(jdtls_path, "config_" .. os_config)
if not vim.uv.fs_stat(config_dir) then
    vim.notify("jdtls config dir not found: " .. config_dir, vim.log.levels.ERROR)
    return
end

local function java_home(version)
    if vim.uv.os_uname().sysname == "Darwin" and vim.fn.executable("/usr/libexec/java_home") == 1 then
        local home = vim.fn.system({ "/usr/libexec/java_home", "-v", version })
        if vim.v.shell_error == 0 then
            return vim.trim(home)
        end
    end
end

local function homebrew_openjdk_home()
    if vim.uv.os_uname().sysname ~= "Darwin" then
        return
    end

    for _, prefix in ipairs({ os.getenv("HOMEBREW_PREFIX"), "/opt/homebrew", "/usr/local" }) do
        if prefix then
            local home = vim.fs.joinpath(prefix, "opt", "openjdk", "libexec", "openjdk.jdk", "Contents", "Home")
            if vim.uv.fs_stat(home) then
                return home
            end
        end
    end
end

local function jdtls_java_cmd()
    local home = os.getenv("JDTLS_JAVA_HOME") or java_home("21") or homebrew_openjdk_home() or os.getenv("JAVA_HOME")
    if home and home ~= "" then
        return vim.fs.joinpath(home, "bin", "java")
    end
    return "java"
end

local function add_runtime(runtimes, name, path)
    if not path or not name then
        return
    end
    for _, runtime in ipairs(runtimes) do
        if runtime.path == path then
            return
        end
    end
    table.insert(runtimes, { name = name, path = path })
end

local function runtime_name_for_home(home)
    if not home then
        return
    end

    local ok, lines = pcall(vim.fn.readfile, vim.fs.joinpath(home, "release"))
    if not ok then
        return
    end

    for _, line in ipairs(lines) do
        local version = line:match('JAVA_VERSION="([^"]+)"')
        if version then
            local major = version:match("^1%.8") and "1.8" or version:match("^(%d+)")
            return major == "1.8" and "JavaSE-1.8" or "JavaSE-" .. major
        end
    end
end

local runtimes = {}
for _, runtime in ipairs({
    { name = "JavaSE-26", version = "26" },
    { name = "JavaSE-25", version = "25" },
    { name = "JavaSE-24", version = "24" },
    { name = "JavaSE-23", version = "23" },
    { name = "JavaSE-22", version = "22" },
    { name = "JavaSE-21", version = "21" },
    { name = "JavaSE-17", version = "17" },
    { name = "JavaSE-11", version = "11" },
    { name = "JavaSE-1.8", version = "1.8" },
}) do
    add_runtime(runtimes, runtime.name, java_home(runtime.version))
end
local homebrew_java_home = homebrew_openjdk_home()
add_runtime(runtimes, runtime_name_for_home(homebrew_java_home), homebrew_java_home)

local project_name = vim.fs.basename(root_dir:gsub("[/\\]+$", ""))
local workspace_dir = vim.fs.joinpath(vim.fn.stdpath("data"), "jdtls-workspaces", project_name)
vim.fn.mkdir(workspace_dir, "p")

local extended_capabilities = vim.deepcopy(jdtls.extendedClientCapabilities)
extended_capabilities.resolveAdditionalTextEditsSupport = true

local cmd = {
    jdtls_java_cmd(),
    "-Declipse.application=org.eclipse.jdt.ls.core.id1",
    "-Dosgi.bundles.defaultStartLevel=4",
    "-Declipse.product=org.eclipse.jdt.ls.core.product",
    "-Dlog.protocol=true",
    "-Dlog.level=ALL",
}

local lombok_jar = vim.fs.joinpath(jdtls_path, "lombok.jar")
if vim.uv.fs_stat(lombok_jar) then
    table.insert(cmd, "-javaagent:" .. lombok_jar)
end

vim.list_extend(cmd, {
    "-Xms1g",
    "-Xmx4g",
    "--add-modules=ALL-SYSTEM",
    "--add-opens",
    "java.base/java.util=ALL-UNNAMED",
    "--add-opens",
    "java.base/java.lang=ALL-UNNAMED",
    "-jar",
    launcher,
    "-configuration",
    config_dir,
    "-data",
    workspace_dir,
})

local java_configuration = {
    updateBuildConfiguration = "interactive",
}
if #runtimes > 0 then
    java_configuration.runtimes = runtimes
end

local config = {
    cmd = cmd,
    root_dir = root_dir,
    capabilities = require("blink.cmp").get_lsp_capabilities(),
    init_options = {
        extendedClientCapabilities = extended_capabilities,
    },
    settings = {
        java = {
            eclipse = {
                downloadSources = true,
            },
            maven = {
                downloadSources = true,
            },
            gradle = {
                downloadSources = true,
            },
            import = {
                maven = {
                    enabled = true,
                },
                gradle = {
                    enabled = true,
                    wrapper = {
                        enabled = true,
                    },
                },
            },
            configuration = java_configuration,
            implementationsCodeLens = {
                enabled = true,
            },
            referencesCodeLens = {
                enabled = true,
            },
            references = {
                includeDecompiledSources = true,
            },
            format = {
                enabled = true,
            },
            signatureHelp = {
                enabled = true,
            },
            completion = {
                favoriteStaticMembers = {
                    "org.hamcrest.MatcherAssert.assertThat",
                    "org.hamcrest.Matchers.*",
                    "org.hamcrest.CoreMatchers.*",
                    "org.junit.jupiter.api.Assertions.*",
                    "java.util.Objects.requireNonNull",
                    "java.util.Objects.requireNonNullElse",
                    "org.mockito.Mockito.*",
                },
            },
            contentProvider = {
                preferred = "fernflower",
            },
            sources = {
                organizeImports = {
                    starThreshold = 9999,
                    staticStarThreshold = 9999,
                },
            },
            codeGeneration = {
                toString = {
                    template = "${object.className}{${member.name()}=${member.value}, ${otherMembers}}",
                },
                useBlocks = true,
            },
        },
    },
    flags = {
        allow_incremental_sync = true,
    },
}

local function organize_imports_sync(bufnr)
    local params = vim.lsp.util.make_range_params(0, "utf-16")
    params.context = { diagnostics = {} }

    local responses = vim.lsp.buf_request_sync(bufnr, "java/organizeImports", params, 5000)
    if not responses then
        return
    end

    for _, response in pairs(responses) do
        if response.err then
            vim.notify("Error organizing imports: " .. response.err.message, vim.log.levels.ERROR)
        elseif response.result then
            vim.lsp.util.apply_workspace_edit(response.result, "utf-16")
        end
    end
end

local function format_java()
    local bufnr = vim.api.nvim_get_current_buf()
    organize_imports_sync(bufnr)

    local ok_conform, conform = pcall(require, "conform")
    if ok_conform then
        conform.format({
            bufnr = bufnr,
            lsp_format = "fallback",
            timeout_ms = 5000,
        })
    else
        vim.lsp.buf.format({ bufnr = bufnr, timeout_ms = 5000 })
    end
end

local function map(lhs, rhs, desc)
    vim.keymap.set("n", lhs, rhs, { buffer = true, silent = true, desc = desc })
end

map("gf", format_java, "Java format and organize imports")
map("<leader>ju", jdtls.update_project_config, "Java update build config")
map("<leader>jU", function()
    jdtls.update_projects_config({ select_mode = "all" })
end, "Java update all build configs")
map("<leader>jb", function()
    jdtls.compile("full")
end, "Java full build")
map("<leader>jr", function()
    require("jdtls.setup").restart()
end, "Java restart jdtls")

jdtls.start_or_attach(config)
