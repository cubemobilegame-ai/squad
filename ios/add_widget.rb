# Dodaje do projektu iOS rozszerzenie widżetu (SquadWidget) i osadza je w aplikacji.
require 'xcodeproj'
require 'fileutils'
repo, build = ARGV[0], ARGV[1]
team = ENV['TEAM_ID']; bid = ENV['BUNDLE_ID']
a = File.join(build, 'ios', 'App')
dir = File.join(a, 'SquadWidget'); FileUtils.mkdir_p(dir)
%w[SquadWidget.swift Info.plist SquadWidget.entitlements].each { |f| FileUtils.cp(File.join(repo, 'ios', 'widget', f), File.join(dir, f)) }

proj = Xcodeproj::Project.open(File.join(a, 'App.xcodeproj'))
app = proj.targets.find { |t| t.name == 'App' } or abort 'brak targetu App'
wt = proj.new_target(:app_extension, 'SquadWidget', :ios, '15.0')
grp = proj.main_group.new_group('SquadWidget', 'SquadWidget')
src = grp.new_file('SquadWidget.swift')
grp.new_file('Info.plist'); grp.new_file('SquadWidget.entitlements')
wt.add_file_references([src])
wt.build_configurations.each do |c|
  s = c.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = "#{bid}.widget"
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['INFOPLIST_FILE'] = 'SquadWidget/Info.plist'
  s['CODE_SIGN_ENTITLEMENTS'] = 'SquadWidget/SquadWidget.entitlements'
  s['SWIFT_VERSION'] = '5.0'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
  s['TARGETED_DEVICE_FAMILY'] = '1'
  s['MARKETING_VERSION'] = '1.0.0'
  s['CURRENT_PROJECT_VERSION'] = '1'
  s['SKIP_INSTALL'] = 'YES'
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['DEVELOPMENT_TEAM'] = team if team
  s['LD_RUNPATH_SEARCH_PATHS'] = '$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks'
  s['SWIFT_EMIT_LOC_STRINGS'] = 'YES'
end
embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
embed.symbol_dst_subfolder_spec = :plug_ins
bf = embed.add_file_reference(wt.product_reference, true)
bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
app.add_dependency(wt)
proj.save
puts 'widget target OK'
